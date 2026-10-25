'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { streamKit, addKitToCart, sendKitFeedback, type KitItemDto, type KitDoneDto } from '../../../lib/api/kit';
import { addPantryItem } from '../../../lib/api/users';
import { addCartItem } from '../../../lib/api/cart';
import { searchProducts, type ProductDto } from '../../../lib/api/catalog';
import { useSessionStore } from '../../../lib/store/session';
import { useActiveCart } from '../../../lib/hooks/use-active-cart';
import { useKitHistory } from '../../../lib/hooks/use-kit-history';
import { AppBar } from '../../../components/layout/app-bar';
import { Icon } from '../../../components/ui/icons';
import { ProductArt, artKeyFor } from '../../../components/ui/product-art';
import { flyToCart } from '../../../lib/fly-to-cart';

const BUCKETS: { key: KitItemDto['bucket']; label: string; color: string }[] = [
  { key: 'in_stock', label: 'In stock', color: 'var(--methi)' },
  { key: 'swap', label: 'Swap suggested', color: 'var(--clay)' },
  { key: 'not_on_tokri', label: 'Not on Tokri yet', color: 'var(--muted)' },
  { key: 'probably_at_home', label: 'Already have at home', color: 'var(--dust)' },
];

const LOADER_STEPS = ['Reading your plan', 'Writing the list', 'Checking stock at your store', 'Finding swaps'];

export default function KitResultPage() {
  const params = useSearchParams();
  const router = useRouter();
  const prompt = params.get('prompt') ?? '';
  const servingsParam = params.get('servings');
  const storeId = useSessionStore((s) => s.storeId);
  const { ensureCart, cart } = useActiveCart();
  const { add: addHistory } = useKitHistory();

  const [items, setItems] = useState<KitItemDto[]>([]);
  const [done, setDone] = useState<KitDoneDto | null>(null);
  const [streaming, setStreaming] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addedAll, setAddedAll] = useState(false);
  const [havePantry, setHavePantry] = useState<Set<string>>(new Set());
  const [notify, setNotify] = useState<Set<string>>(new Set());
  const [excluded, setExcluded] = useState<Set<number>>(new Set());
  const [overrides, setOverrides] = useState<Record<number, { variantId: string; name: string; price: number }>>({});
  const [servings, setServings] = useState<number | null>(servingsParam ? Number(servingsParam) : null);
  const [feedback, setFeedback] = useState<0 | 1 | null>(null);
  const [altFor, setAltFor] = useState<number | null>(null);
  const rowRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const historySaved = useRef(false);

  useEffect(() => {
    if (!storeId || !prompt) return;
    let cancelled = false;
    setItems([]);
    setDone(null);
    setStreaming(true);
    setExcluded(new Set());
    setOverrides({});
    setAddedAll(false);
    historySaved.current = false;
    streamKit(
      prompt,
      storeId,
      servings ?? undefined,
      (item) => { if (!cancelled) setItems((prev) => [...prev, item]); },
      (result) => {
        if (cancelled) return;
        setDone(result);
        setStreaming(false);
        if (result.servings) setServings(result.servings);
        if (!historySaved.current) {
          historySaved.current = true;
          addHistory({ prompt, itemCount: result.items.length });
        }
      },
      (message) => { if (!cancelled) { setError(message); setStreaming(false); } },
    );
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prompt, storeId, servings]);

  function isSelected(idx: number) {
    return !excluded.has(idx);
  }
  function toggleTick(idx: number) {
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
    setAddedAll(false);
  }
  function tickAll(targetOn: boolean) {
    setExcluded((prev) => {
      const next = new Set(prev);
      items.forEach((it, idx) => {
        if (it.bucket === 'in_stock') {
          if (targetOn) next.delete(idx);
          else next.add(idx);
        }
      });
      return next;
    });
    setAddedAll(false);
  }

  function variantFor(item: KitItemDto, idx: number) {
    const ov = overrides[idx];
    if (ov) return { variantId: ov.variantId, name: ov.name, price: ov.price };
    return { variantId: item.matchedVariantId, name: item.matchedName, price: item.price };
  }

  const selectedRows = items
    .map((it, idx) => ({ it, idx }))
    .filter(({ it, idx }) => (it.bucket === 'in_stock' || it.bucket === 'swap') && isSelected(idx));
  const selectedTotal = selectedRows.reduce((sum, { it, idx }) => sum + (variantFor(it, idx).price ?? 0), 0);

  const liveTokri = cart && cart.type === 'shared' && cart.status === 'open' ? cart : null;

  async function addSelected(toTokri = false) {
    if (selectedRows.length === 0) return;
    selectedRows.forEach(({ idx }, i) => {
      const el = rowRefs.current[idx];
      if (el) setTimeout(() => flyToCart(el, toTokri ? '#F2B705' : '#2F8F4A'), i * 90);
    });
    if (toTokri && liveTokri) {
      for (const { it, idx } of selectedRows) {
        const v = variantFor(it, idx);
        if (v.variantId) await addCartItem(liveTokri.id, v.variantId, 1, `From parchi: ${prompt}`);
      }
      router.push(`/tokri/${liveTokri.id}`);
      return;
    }
    const cartId = await ensureCart();
    for (const { it, idx } of selectedRows) {
      const v = variantFor(it, idx);
      if (v.variantId) await addCartItem(cartId, v.variantId, 1);
    }
    setAddedAll(true);
  }

  function togglePantry(name: string) {
    setHavePantry((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else { next.add(name); addPantryItem(name, done?.goalType === 'repair' ? 'tool' : 'pantry'); }
      return next;
    });
  }

  function sendFeedback(value: 0 | 1) {
    setFeedback(value);
    if (done) sendKitFeedback(done.id, value === 1 ? 'thumbs_up' : 'thumbs_down');
  }

  function adjustServings(delta: number) {
    if (!servings) return;
    setServings(Math.min(30, Math.max(1, servings + delta)));
  }

  const grouped = BUCKETS.map((b) => ({ ...b, rows: items.map((it, idx) => ({ it, idx })).filter((r) => r.it.bucket === b.key) }));
  const legend = grouped.filter((g) => g.rows.length > 0);
  const recipe = done?.goalType === 'recipe';

  if ((streaming && items.length === 0) || !done) {
    return (
      <>
        <AppBar title="Writing your parchi" backHref="/kit" />
        <section className="parchi writing">
          <span className="tape" aria-hidden />
          <div className="parchi-head hand">
            <span>Parchi no. 041</span>
            <span>{new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
          </div>
          <p className="hand pw-title">{prompt}</p>
          <ol className="pw-lines hand">
            {items.map((it, i) => (
              <li key={i}>{it.name}</li>
            ))}
          </ol>
        </section>
        <ul className="loader">
          {LOADER_STEPS.map((s, i) => (
            <li key={s} style={{ display: 'flex', gap: 10, alignItems: 'center', fontWeight: 500, opacity: items.length >= i * 2 || !streaming ? 1 : 0.3, marginBottom: 10 }}>
              <span style={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid var(--ink)', background: items.length >= i * 2 || !streaming ? 'var(--haldi)' : 'transparent', flex: 'none' }} />
              {s}
            </li>
          ))}
        </ul>
        {error && <p className="small pad" style={{ padding: '0 16px', color: 'var(--mirchi)' }}>{error}</p>}
      </>
    );
  }

  return (
    <>
      <AppBar title="Your parchi" backHref="/kit" right={<button className="iconbtn" aria-label="Share parchi" onClick={() => navigator.clipboard?.writeText(window.location.href)}><Icon name="share" /></button>} />

      <section className="parchi kr-card">
        <span className="tape" aria-hidden />
        <div className="parchi-head hand">
          <span>Parchi no. {String(41).padStart(3, '0')}</span>
          <span>{new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
        </div>
        <p className="hand kr-title">{prompt}</p>
        <p className="small" style={{ color: '#6B6458' }}>
          {items.length} things on the list{recipe && servings ? `, for ${servings} people` : ''}
        </p>
        <div className="cover" aria-hidden>
          {legend.map((g) => (
            <i key={g.key} style={{ flex: g.rows.length, background: g.color }} />
          ))}
        </div>
        <div className="legend">
          {legend.map((g) => (
            <span key={g.key}>
              <i style={{ background: g.color }} />
              {g.rows.length} {g.label.toLowerCase()}
            </span>
          ))}
        </div>
        {recipe && servings && (
          <div className="row between kr-serv" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <b className="small">Cooking for</b>
            <div className="step">
              <button onClick={() => adjustServings(-1)} aria-label="Fewer">−</button>
              <span>{servings}</span>
              <button onClick={() => adjustServings(1)} aria-label="More">+</button>
            </div>
          </div>
        )}
      </section>

      {done.clarifyingQuestion && (
        <section className="card" style={{ margin: '14px 16px 0', padding: 14 }}>
          <p className="small">{done.clarifyingQuestion}</p>
        </section>
      )}
      {done.safetyNote && (
        <section className="safety">
          <h4>Before you start</h4>
          <p className="small">{done.safetyNote}</p>
        </section>
      )}

      {grouped.map((group) => {
        if (group.rows.length === 0) return null;
        if (group.key === 'not_on_tokri') {
          return (
            <section key={group.key} className="bucket">
              <header style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', borderBottom: '2px solid var(--ink)', paddingBottom: 6, marginBottom: 4 }}>
                <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 19, display: 'flex', gap: 8, alignItems: 'center' }}>
                  <i style={{ width: 12, height: 12, borderRadius: 3, border: '2px solid var(--ink)', display: 'inline-block', background: group.color }} />
                  {group.label}
                </h3>
                <span className="small muted">{group.rows.length}</span>
              </header>
              {group.rows.map(({ it, idx }) => (
                <div key={idx} className="krow" data-b="missing">
                  <span />
                  <div className="ghosttile" aria-hidden>?</div>
                  <div>
                    <span className="kneed hand">{it.name}{it.qty ? `, ${it.qty} ${it.unit}` : ''}</span>
                    <span className="small muted">Get this from a local shop for now</span>
                  </div>
                  <button className="chip" style={{ alignSelf: 'center' }} aria-pressed={notify.has(it.name)} onClick={() => setNotify((p) => { const n = new Set(p); n.has(it.name) ? n.delete(it.name) : n.add(it.name); return n; })}>
                    {notify.has(it.name) ? 'We’ll tell you' : 'Notify me'}
                  </button>
                </div>
              ))}
            </section>
          );
        }
        if (group.key === 'probably_at_home') {
          return (
            <section key={group.key} className="bucket">
              <header style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', borderBottom: '2px solid var(--ink)', paddingBottom: 6, marginBottom: 4 }}>
                <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 19, display: 'flex', gap: 8, alignItems: 'center' }}>
                  <i style={{ width: 12, height: 12, borderRadius: 3, border: '2px solid var(--ink)', display: 'inline-block', background: group.color }} />
                  {group.label}
                </h3>
                <span className="small muted">{group.rows.length}</span>
              </header>
              {group.rows.map(({ it }) => (
                <div key={it.name} className={`krow${havePantry.has(it.name) ? ' have' : ''}`} data-b="home">
                  <button className="check" aria-pressed={havePantry.has(it.name)} aria-label={`I have ${it.name}`} onClick={() => togglePantry(it.name)} />
                  <div className="ghosttile home" aria-hidden><Icon name="home" /></div>
                  <div>
                    <span className="kneed hand">{it.name}{it.qty ? `, ${it.qty} ${it.unit}` : ''}</span>
                    <span className="small muted">{havePantry.has(it.name) ? 'Got it, we’ll remember' : 'Tick if you have it'}</span>
                  </div>
                </div>
              ))}
              <p className="small muted" style={{ marginTop: 8 }}>Tick what you have. We&rsquo;ll remember it next time.</p>
            </section>
          );
        }
        return (
          <section key={group.key} className="bucket">
            <header style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', borderBottom: '2px solid var(--ink)', paddingBottom: 6, marginBottom: 4 }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 19, display: 'flex', gap: 8, alignItems: 'center' }}>
                <i style={{ width: 12, height: 12, borderRadius: 3, border: '2px solid var(--ink)', display: 'inline-block', background: group.color }} />
                {group.label}
              </h3>
              {group.key === 'in_stock' ? (
                <button className="link small" onClick={() => tickAll(group.rows.some((r) => !isSelected(r.idx)))}>
                  {group.rows.every((r) => isSelected(r.idx)) ? 'Untick all' : 'Tick all'}
                </button>
              ) : (
                <span className="small muted">{group.rows.length}</span>
              )}
            </header>
            {group.rows.map(({ it, idx }) => {
              const sel = isSelected(idx);
              const v = variantFor(it, idx);
              const swap = it.bucket === 'swap';
              return (
                <div
                  key={idx}
                  ref={(el) => { rowRefs.current[idx] = el; }}
                  className={`krow${sel ? '' : ' unsel'}`}
                  data-b={it.bucket}
                >
                  <button className="check" aria-pressed={sel} aria-label={`Include ${it.name}`} onClick={() => toggleTick(idx)} />
                  <div className={`ptile t-dust`}>
                    <ProductArt artKey={artKeyFor(v.name ?? it.name)} />
                  </div>
                  <div>
                    <span className="kneed hand">
                      {swap ? <s>{it.name}</s> : it.name}
                      {it.qty ? `, ${it.qty} ${it.unit}` : ''}
                      {!it.essential && <span className="tag" style={{ border: '1.5px solid currentColor', borderRadius: 999, color: 'var(--muted)' }}>optional</span>}
                    </span>
                    {v.name && <h4>{v.name}</h4>}
                    <div className="kmeta">
                      {v.price != null && <span className="price" style={{ fontSize: 13 }}>₹{v.price}</span>}
                      <button className="link small" onClick={() => setAltFor(idx)}>Change</button>
                    </div>
                    {swap && it.reason && <p className="swapnote small">{it.reason}</p>}
                  </div>
                </div>
              );
            })}
          </section>
        );
      })}

      {done.steps && done.steps.length > 0 && (
        <details className="method" style={{ margin: '22px 16px 0', border: '2px solid var(--ink)', borderRadius: 14, padding: '12px 14px' }}>
          <summary style={{ fontWeight: 600, cursor: 'pointer' }}>{recipe ? 'How to make it' : 'How to do it'}, {done.steps.length} steps</summary>
          <ol className="steps2">
            {done.steps.map((s, i) => (
              <li key={i}>
                <span>{i + 1}</span>
                <p>{s}</p>
              </li>
            ))}
          </ol>
        </details>
      )}

      <div className="kfeed">
        <span>Was this parchi right?</span>
        <button aria-label="Yes" aria-pressed={feedback === 1} onClick={() => sendFeedback(1)}><Icon name="up" /></button>
        <button aria-label="No" aria-pressed={feedback === 0} onClick={() => sendFeedback(0)}><Icon name="down" /></button>
      </div>
      <div style={{ height: 90 }} />

      <div className="buybar kitbar">
        <div>
          <span className="small muted">{selectedRows.length} item{selectedRows.length === 1 ? '' : 's'} ticked</span>
          <div className="price" style={{ fontSize: 18 }}>₹{selectedTotal}</div>
        </div>
        <div className="row" style={{ display: 'flex', gap: 8 }}>
          {liveTokri && (
            <button className="iconbtn" aria-label="Send to your Tokri" onClick={() => addSelected(true)}>
              <Icon name="tokri" />
            </button>
          )}
          {addedAll ? (
            <button className="btn ink" onClick={() => router.push('/cart')}>
              View cart <Icon name="arrow" className="h-4 w-4" />
            </button>
          ) : (
            <button className="btn primary" disabled={selectedRows.length === 0} onClick={() => addSelected(false)}>
              Add {selectedRows.length} to cart
            </button>
          )}
        </div>
      </div>

      {altFor != null && (
        <AltSheet
          item={items[altFor]}
          currentName={variantFor(items[altFor], altFor).name}
          storeId={storeId}
          onPick={(p) => {
            const v = p.variants[0];
            if (v) setOverrides((prev) => ({ ...prev, [altFor]: { variantId: v.id, name: `${p.name} (${v.size})`, price: v.price } }));
            setAltFor(null);
          }}
          onClose={() => setAltFor(null)}
        />
      )}
    </>
  );
}

function AltSheet({ item, currentName, storeId, onPick, onClose }: { item: KitItemDto; currentName: string | null; storeId: string | null; onPick: (p: ProductDto) => void; onClose: () => void }) {
  const q = useQuery({
    queryKey: ['search', storeId, item.name],
    queryFn: () => searchProducts(item.name, storeId!),
    enabled: !!storeId,
  });
  const options = useMemo(() => (q.data ?? []).slice(0, 6), [q.data]);

  return (
    <div className="sheetback" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet" role="dialog" aria-label="Choose an option">
        <p className="small muted">For &ldquo;{item.name}&rdquo;</p>
        <p className="font-display" style={{ fontSize: 24, marginBottom: 6 }}>Pick a different option</p>
        {options.map((p) => {
          const v = p.variants[0];
          const label = v ? `${p.name} (${v.size})` : p.name;
          return (
            <button key={p.id} className="opt altopt" role="radio" aria-checked={label === currentName} onClick={() => onPick(p)}>
              <span className="radio" />
              <span className="row" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <span className={`ptile t-${p.tileColor}`}>
                  <ProductArt artKey={artKeyFor(p.name, p.category.slug)} tint={p.tileColor} />
                </span>
                <span>
                  <b>{p.name}</b>
                  <br />
                  <span className="small muted">{v?.size}</span>
                </span>
              </span>
              <span className="mono small">₹{v?.price}</span>
            </button>
          );
        })}
        {options.length === 0 && <p className="small muted" style={{ padding: '12px 0' }}>No other options found.</p>}
      </div>
    </div>
  );
}
