'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSharedCart } from '../../../lib/hooks/use-shared-cart';
import { useAuthStore } from '../../../lib/store/auth';
import { useSessionStore } from '../../../lib/store/session';
import { useActiveCart } from '../../../lib/hooks/use-active-cart';
import {
  getBill,
  getShares,
  lockCart,
  removeCartItem,
  addCartItem,
  setBudgetCap,
  setSplitMode,
  type CartStateDto,
  type CartItemDto,
} from '../../../lib/api/cart';
import { getSocket } from '../../../lib/socket';
import { AppBar } from '../../../components/layout/app-bar';
import { Icon } from '../../../components/ui/icons';
import { ProductArt, artKeyFor } from '../../../components/ui/product-art';

const SPLIT_LABELS: Record<CartStateDto['splitMode'], string> = {
  host_pays_all: 'I pay',
  pay_for_own: 'Own items',
  split_equally: 'Equally',
  custom: 'Custom',
};

const TABS: { key: 'items' | 'activity' | 'split'; label: (n: number) => string }[] = [
  { key: 'items', label: (n) => `Items ${n}` },
  { key: 'activity', label: () => 'Activity' },
  { key: 'split', label: () => 'Split bill' },
];

function ago(iso: string) {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  return `${Math.round(m / 60)} h ago`;
}

function qrCells(seed: string) {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const rnd = () => {
    h = (h * 1103515245 + 12345) >>> 0;
    return (h >>> 16) & 1;
  };
  const n = 25;
  const cells: { x: number; y: number }[] = [];
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const inFinder = (x < 8 && y < 8) || (x > n - 9 && y < 8) || (x < 8 && y > n - 9);
      if (!inFinder && rnd()) cells.push({ x, y });
    }
  }
  return { n, cells };
}

function QrDecoration({ seed }: { seed: string }) {
  const { n, cells } = useMemo(() => qrCells(seed), [seed]);
  const finder = (x: number, y: number) => (
    <g key={`${x}-${y}`}>
      <rect x={x} y={y} width={7} height={7} fill="#1B1A17" />
      <rect x={x + 1} y={y + 1} width={5} height={5} fill="#fff" />
      <rect x={x + 2} y={y + 2} width={3} height={3} fill="#1B1A17" />
    </g>
  );
  return (
    <svg viewBox={`0 0 ${n} ${n}`} shapeRendering="crispEdges" role="img" aria-label="QR code to join" style={{ width: 140, margin: '0 auto', display: 'block' }}>
      {cells.map((c) => <rect key={`${c.x}-${c.y}`} x={c.x} y={c.y} width={1} height={1} fill="#1B1A17" />)}
      {finder(0, 0)}
      {finder(n - 7, 0)}
      {finder(0, n - 7)}
    </svg>
  );
}

export default function SharedTokriPage() {
  const { cartId } = useParams<{ cartId: string }>();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { cart, orderId } = useSharedCart(cartId);
  const { addItem } = useActiveCart();
  const setActiveCart = useSessionStore((s) => s.setActiveCart);
  const [showInvite, setShowInvite] = useState(false);
  const [budgetInput, setBudgetInput] = useState('');
  const [tab, setTab] = useState<'items' | 'activity' | 'split'>('items');
  const [holding, setHolding] = useState(false);
  const [customShares, setCustomShares] = useState<Record<string, number>>({});
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [mergedKeys, setMergedKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    setActiveCart(cartId);
  }, [cartId, setActiveCart]);

  const billQuery = useQuery({
    queryKey: ['cart-bill', cartId, cart?.items.length],
    queryFn: () => getBill(cartId),
    enabled: !!cart,
  });
  const sharesQuery = useQuery({
    queryKey: ['cart-shares', cartId, cart?.splitMode, cart?.items.length, cart?.members.length],
    queryFn: () => getShares(cartId),
    enabled: !!cart,
  });

  const isHost = cart?.hostId === user?.id;
  const inviteUrl = useMemo(
    () => (cart?.inviteCode && typeof window !== 'undefined' ? `${window.location.origin}/tokri/join/${cart.inviteCode}` : ''),
    [cart?.inviteCode],
  );

  const itemsByMember = useMemo(() => {
    if (!cart) return [] as { member: CartStateDto['members'][number]; items: CartStateDto['items'] }[];
    return cart.members.map((member) => ({ member, items: cart.items.filter((i) => i.addedBy === member.userId) })).filter((g) => g.items.length);
  }, [cart]);

  const duplicateGroups = useMemo(() => {
    if (!cart) return [] as CartItemDto[][];
    const byVariant = new Map<string, CartItemDto[]>();
    for (const item of cart.items) {
      if (!byVariant.has(item.variantId)) byVariant.set(item.variantId, []);
      byVariant.get(item.variantId)!.push(item);
    }
    return [...byVariant.values()].filter((g) => g.length > 1 && !mergedKeys.has(g[0].variantId));
  }, [cart, mergedKeys]);

  const activity = useMemo(() => {
    if (!cart) return [] as { who: string; color: string; text: string; at: string }[];
    const events: { who: string; color: string; text: string; at: string }[] = [];
    for (const m of cart.members) {
      events.push({ who: m.userId === user?.id ? 'You' : m.name, color: m.color, text: 'joined the Tokri', at: m.joinedAt });
    }
    for (const item of cart.items) {
      const member = cart.members.find((m) => m.userId === item.addedBy);
      events.push({ who: item.addedBy === user?.id ? 'You' : member?.name ?? 'Someone', color: member?.color ?? '#999', text: `added ${item.name}`, at: item.createdAt });
    }
    return events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  }, [cart, user?.id]);

  if (!cart) {
    return (
      <>
        <AppBar title="Shared Tokri" backHref="/" />
        <p className="pad small" style={{ padding: 16, color: 'var(--muted)' }}>Loading…</p>
      </>
    );
  }

  async function react(itemId: string, value: 'up' | 'down') {
    getSocket().emit('item:react', { cartId, itemId, value });
  }
  async function toggleDone(isDone: boolean) {
    getSocket().emit('member:done', { cartId, isDone });
  }
  async function handleSplit(mode: CartStateDto['splitMode']) {
    await setSplitMode(cartId, mode);
  }
  async function handleBudget() {
    await setBudgetCap(cartId, budgetInput ? Number(budgetInput) : null);
    setBudgetInput('');
  }
  async function mergeGroup(group: CartItemDto[]) {
    const totalQty = group.reduce((a, i) => a + i.qty, 0);
    await addItem.mutateAsync({ variantId: group[0].variantId, qty: totalQty });
    for (const item of group) await removeCartItem(cartId, item.id);
    setMergedKeys((s) => new Set(s).add(group[0].variantId));
  }

  function startHold() {
    setHolding(true);
    holdTimer.current = setTimeout(async () => {
      holdTimer.current = null;
      await lockCart(cartId);
      setTab('split');
    }, 900);
  }
  function cancelHold() {
    if (holdTimer.current) {
      clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
    setHolding(false);
  }

  const doneCount = cart.members.filter((m) => m.isDone).length;
  const bill = billQuery.data;
  const shares = sharesQuery.data ?? [];
  const budgetPct = cart.budgetCap && bill ? Math.min(100, (bill.subtotal / cart.budgetCap) * 100) : 0;

  function shareAmount(userId: string) {
    if (cart!.splitMode === 'custom' && customShares[userId] != null) return customShares[userId];
    return shares.find((s) => s.userId === userId)?.amount ?? 0;
  }

  const tabIndex = TABS.findIndex((t) => t.key === tab);

  return (
    <>
      <AppBar
        title={cart.name ?? 'Shared Tokri'}
        backHref="/"
        right={
          <button className="btn" style={{ padding: '7px 12px', boxShadow: '2px 2px 0 var(--ink)' }} onClick={() => setShowInvite(true)}>
            <Icon name="share" className="h-4 w-4" /> Invite
          </button>
        }
      />

      <section className="tk-hero">
        <div className="tk-top">
          <span className="small" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#2F8F4A', display: 'inline-block' }} />
            {cart.status === 'locked' ? 'Locked' : 'Live now'}
          </span>
          <span className="small"><b>{doneCount} of {cart.members.length}</b> ready</span>
        </div>
        <div className="tk-members">
          {cart.members.map((m) => {
            const ready = m.isDone;
            return (
              <div key={m.userId} className="tkm">
                <span className="av live" style={{ background: m.color }}>
                  {m.name[0]?.toUpperCase()}
                  {ready && <i className="okmark"><Icon name="check" className="h-[11px] w-[11px]" /></i>}
                </span>
                <b>{m.userId === user?.id ? 'You' : m.name}</b>
                <small>{ready ? 'Ready' : 'Shopping'}</small>
              </div>
            );
          })}
          {cart.status === 'open' && cart.members.length < 10 && (
            <button className="tkm" onClick={() => setShowInvite(true)}>
              <span className="av plus" aria-hidden>+</span>
              <b>Invite</b>
              <small>Add people</small>
            </button>
          )}
        </div>
        {cart.budgetCap != null && bill && (
          <div className="tk-gauge">
            <svg viewBox="0 0 100 56" className="gauge" aria-hidden>
              <path d="M10 50A40 40 0 0 1 90 50" className="gtrack" />
              <path
                d="M10 50A40 40 0 0 1 90 50"
                className={`gfill ${budgetPct > 90 ? 'warn' : ''}`}
                pathLength={100}
                strokeDasharray={100}
                strokeDashoffset={100 - budgetPct}
              />
            </svg>
            <div>
              <span className="small">Spent so far</span>
              <b className="tabular-price">₹{bill.subtotal}</b>
              <small>of ₹{cart.budgetCap} budget{bill.subtotal >= 199 ? ', free delivery' : `, ₹${199 - bill.subtotal} to free delivery`}</small>
            </div>
          </div>
        )}
      </section>

      <div className="tktabs" role="tablist">
        <span className="tkpill" aria-hidden style={{ transform: `translateX(${tabIndex * 100}%)` }} />
        {TABS.map((t) => (
          <button key={t.key} role="tab" aria-selected={tab === t.key} onClick={() => setTab(t.key)}>
            {t.label(cart.items.length)}
          </button>
        ))}
      </div>

      {tab === 'items' && (
        <>
          {cart.status === 'open' && (
            <div className="donecard">
              <div>
                <b>{cart.members.find((m) => m.userId === user?.id)?.isDone ? 'You’re marked ready' : 'Done adding?'}</b>
                <p className="small muted">{cart.members.find((m) => m.userId === user?.id)?.isDone ? 'Everyone can see you’re ready.' : 'Let everyone know you’ve finished.'}</p>
              </div>
              <button
                className="check"
                aria-pressed={cart.members.find((m) => m.userId === user?.id)?.isDone ?? false}
                aria-label="I'm done adding"
                onClick={() => toggleDone(!(cart.members.find((m) => m.userId === user?.id)?.isDone ?? false))}
                style={{ width: 22, height: 22, border: '2px solid var(--ink)', borderRadius: 6, background: cart.members.find((m) => m.userId === user?.id)?.isDone ? 'var(--methi)' : 'var(--card)' }}
              />
            </div>
          )}

          {isHost && duplicateGroups.map((group) => (
            <div key={group[0].variantId} className="merge" style={{ margin: '16px 16px 0', padding: '12px 14px', border: '2px solid var(--clay)', borderRadius: 14, background: 'color-mix(in srgb, var(--clay) 10%, var(--paper))' }}>
              <b>{group.length} people added {group[0].name}.</b>
              <div className="row" style={{ marginTop: 8 }}>
                <button className="btn" style={{ padding: '6px 12px', boxShadow: '2px 2px 0 var(--ink)' }} onClick={() => mergeGroup(group)}>
                  Merge into one line
                </button>
              </div>
            </div>
          ))}

          {itemsByMember.map(({ member, items }) => (
            <section key={member.userId} className="group" style={{ margin: '18px 16px 0', borderLeft: `5px solid ${member.color}`, paddingLeft: 12 }}>
              <header style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                <span style={{ width: 24, height: 24, borderRadius: '50%', border: '2px solid var(--ink)', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 600, background: member.color }}>
                  {member.name[0]}
                </span>
                <b className="font-display" style={{ fontSize: 17 }}>{member.userId === user?.id ? 'Your items' : member.name}</b>
                <span className="small" style={{ color: 'var(--muted)' }}>{items.length} item{items.length > 1 ? 's' : ''}</span>
              </header>
              {items.map((item) => {
                const myReaction = item.reactions.find((r) => r.userId === user?.id)?.value;
                const isMine = item.addedBy === user?.id;
                return (
                  <div key={item.id} className="trow" style={{ display: 'grid', gridTemplateColumns: '44px 1fr auto', gap: 10, alignItems: 'center', padding: '8px 0', borderBottom: '1.5px dashed var(--dust)' }}>
                    <div className="ptile t-dust" style={{ padding: 5, borderRadius: 8 }}>
                      <ProductArt artKey={artKeyFor(item.name)} />
                    </div>
                    <div>
                      <h4 style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.25 }}>{item.name}</h4>
                      <span className="small" style={{ color: 'var(--muted)' }}>₹{item.price * item.qty}</span>
                      {!isMine && (
                        <div className="react" style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                          <button
                            aria-pressed={myReaction === 'up'}
                            onClick={() => react(item.id, 'up')}
                            style={{ display: 'flex', alignItems: 'center', gap: 3, border: '1.5px solid var(--dust)', borderRadius: 999, padding: '1px 8px', fontSize: 12, background: myReaction === 'up' ? 'var(--dust)' : undefined }}
                          >
                            <Icon name="up" className="h-3 w-3" /> {item.reactions.filter((r) => r.value === 'up').length}
                          </button>
                          <button
                            aria-pressed={myReaction === 'down'}
                            onClick={() => react(item.id, 'down')}
                            style={{ display: 'flex', alignItems: 'center', gap: 3, border: '1.5px solid var(--dust)', borderRadius: 999, padding: '1px 8px', fontSize: 12, background: myReaction === 'down' ? 'var(--dust)' : undefined }}
                          >
                            <Icon name="down" className="h-3 w-3" /> {item.reactions.filter((r) => r.value === 'down').length}
                          </button>
                        </div>
                      )}
                    </div>
                    {(isMine || isHost) && cart.status === 'open' ? (
                      <button className="link small" onClick={() => removeCartItem(cartId, item.id)}>Remove</button>
                    ) : (
                      <span className="tabular-price small">× {item.qty}</span>
                    )}
                  </div>
                );
              })}
            </section>
          ))}

          {cart.status === 'open' && (
            <div className="pad" style={{ padding: 16 }}>
              <button className="btn ghost block" onClick={() => router.push('/')}>+ Add more items</button>
            </div>
          )}
        </>
      )}

      {tab === 'activity' && (
        <ol className="feed">
          {activity.slice(0, 20).map((e, i) => (
            <li key={i}>
              <span className="av" style={{ width: 28, height: 28, fontSize: 11, background: e.color }}>{e.who[0]}</span>
              <p><b>{e.who}</b> {e.text}</p>
              <time>{ago(e.at)}</time>
            </li>
          ))}
          {activity.length === 0 && <li style={{ color: 'var(--muted)' }}>Nothing yet.</li>}
        </ol>
      )}

      {tab === 'split' && bill && (
        <section className="pblock" style={{ margin: '16px 16px 0' }}>
          <p className="h-display" style={{ fontFamily: 'var(--font-display)', fontSize: 20 }}>How should we split ₹{bill.total}?</p>
          <div className="seg" role="group" aria-label="Split mode" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', border: '2px solid var(--ink)', borderRadius: 12, overflow: 'hidden', marginTop: 10 }}>
            {(Object.keys(SPLIT_LABELS) as CartStateDto['splitMode'][]).map((mode, i) => (
              <button
                key={mode}
                aria-pressed={cart.splitMode === mode}
                disabled={!isHost}
                onClick={() => handleSplit(mode)}
                style={{ padding: '8px 2px', fontSize: 12.5, fontWeight: 600, borderRight: i < 3 ? '2px solid var(--ink)' : undefined, background: cart.splitMode === mode ? 'var(--ink)' : undefined, color: cart.splitMode === mode ? 'var(--paper)' : undefined }}
              >
                {SPLIT_LABELS[mode]}
              </button>
            ))}
          </div>

          <div className="sharebar" aria-hidden>
            {shares.filter((s) => s.amount > 0).map((s) => (
              <i key={s.userId} style={{ flex: s.amount, background: cart.members.find((m) => m.userId === s.userId)?.color }} />
            ))}
          </div>

          <div className="shares2">
            {cart.members.map((m) => (
              <div key={m.userId} className="sh">
                <span className="av" style={{ background: m.color }}>{m.name[0]}</span>
                <div>
                  <b>{m.userId === user?.id ? 'You' : m.name}</b>
                  <small>{m.userId === cart.hostId ? 'Host' : ''}</small>
                </div>
                {cart.splitMode === 'custom' && isHost ? (
                  <input
                    type="number"
                    value={Math.round(shareAmount(m.userId))}
                    aria-label={`${m.name}'s share`}
                    onChange={(e) => setCustomShares((s) => ({ ...s, [m.userId]: Number(e.target.value) }))}
                  />
                ) : (
                  <span className="tabular-price">₹{Math.round(shareAmount(m.userId))}</span>
                )}
                <span className={`paid ${m.userId === cart.hostId ? 'y' : 'n'}`}>{m.userId === cart.hostId ? 'Pays via checkout' : 'Pending'}</span>
              </div>
            ))}
          </div>
          {cart.splitMode === 'custom' && (
            <p className="small muted" style={{ marginTop: 8 }}>Custom amounts above are a planning aid only — everyone is billed an equal share until this is wired up to payments.</p>
          )}
          {cart.splitMode === 'pay_for_own' && (
            <p className="small muted" style={{ marginTop: 8 }}>Delivery and platform fees are shared equally.</p>
          )}
        </section>
      )}

      <div style={{ height: 16 }} />

      <div className="buybar tkbar">
        <div>
          <span className="small muted">{cart.status === 'ordered' ? 'Paid' : cart.status === 'locked' ? 'Locked total' : 'Total so far'}</span>
          <div className="price" style={{ fontSize: 19 }}>₹{bill?.total ?? 0}</div>
        </div>
        {cart.status === 'ordered' ? (
          <button
            className="btn primary"
            disabled={!orderId}
            onClick={() => orderId && router.push(`/orders/${orderId}`)}
          >
            Order placed <Icon name="arrow" className="h-[18px] w-[18px]" />
          </button>
        ) : cart.status === 'open' ? (
          isHost && (
            <button
              className={`holdlock ${holding ? 'holding' : ''}`}
              aria-label="Hold to lock the cart"
              onPointerDown={startHold}
              onPointerUp={cancelHold}
              onPointerLeave={cancelHold}
              onPointerCancel={cancelHold}
            >
              <span className="hl-fill" />
              <span className="hl-text"><Icon name="lock" className="h-[18px] w-[18px]" /> Hold to lock</span>
            </button>
          )
        ) : isHost ? (
          <button className="btn primary" onClick={() => router.push(`/checkout?cartId=${cartId}`)}>
            Checkout <Icon name="arrow" className="h-[18px] w-[18px]" />
          </button>
        ) : (
          <span className="small muted">Waiting for {cart.members.find((m) => m.userId === cart.hostId)?.name ?? 'host'} to checkout</span>
        )}
      </div>

      {isHost && cart.status === 'open' && (
        <div className="pad" style={{ padding: '0 16px 16px' }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={budgetInput} onChange={(e) => setBudgetInput(e.target.value)} placeholder="Budget cap ₹" className="field" style={{ width: 140, padding: '6px 10px' }} />
            <button className="btn" style={{ padding: '6px 12px' }} onClick={handleBudget}>Set budget</button>
          </div>
        </div>
      )}

      {showInvite && (
        <div className="sheetback" onClick={(e) => e.target === e.currentTarget && setShowInvite(false)}>
          <div className="sheet" role="dialog" aria-label="Invite to Tokri">
            <p className="h-display" style={{ fontFamily: 'var(--font-display)', fontSize: 24 }}>Invite to {cart.name ?? 'Tokri'}</p>
            <p className="small muted" style={{ marginTop: 6 }}>Anyone with this link can add items until you lock the cart. It expires in 24 hours.</p>
            <div className="qr" style={{ margin: '14px 0' }}>
              <QrDecoration seed={cart.inviteCode ?? cart.id} />
            </div>
            <div className="row" style={{ display: 'flex', gap: 8, alignItems: 'center', border: '2px solid var(--ink)', borderRadius: 12, padding: '10px 12px', background: 'var(--card)' }}>
              <span className="tabular-price small" style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{inviteUrl}</span>
              <button className="link small" onClick={() => navigator.clipboard.writeText(inviteUrl)}>Copy</button>
            </div>
            <div className="stack" style={{ gap: 8, marginTop: 12, display: 'flex', flexDirection: 'column' }}>
              <a href={`https://wa.me/?text=${encodeURIComponent(`Join our Tokri "${cart.name}": ${inviteUrl}`)}`} target="_blank" rel="noreferrer" className="btn primary block" style={{ textAlign: 'center' }}>
                Share on WhatsApp
              </a>
              <button className="btn ghost block" onClick={() => setShowInvite(false)}>Done</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
