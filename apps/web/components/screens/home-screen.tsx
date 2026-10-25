'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { listCategories, listProducts, nearestStore, type ProductDto } from '../../lib/api/catalog';
import { listMyOrders, reorder } from '../../lib/api/orders';
import { listAddresses } from '../../lib/api/addresses';
import { useSessionStore } from '../../lib/store/session';
import { useAuthStore } from '../../lib/store/auth';
import { artKeyFor, ProductArt, type ArtKey } from '../ui/product-art';
import { Icon } from '../ui/icons';
import { QuantityStepper } from '../ui/quantity-stepper';
import { AddressSheet } from '../ui/address-sheet';
import { useActiveCart } from '../../lib/hooks/use-active-cart';
import { CATEGORY_TINT } from '../../lib/category-meta';

// Only "Stationery" and "Personal Care" are short enough to fit a 1x1 tile
// without wrapping into the corner icon; everything else needs the wide span.
const BENTO_SPAN: Record<string, 'c-big' | 'c-wide' | ''> = {
  'vegetables-fruits': 'c-big',
  'grocery-staples': 'c-wide',
  'hardware-tools': 'c-wide',
  'electronics-accessories': 'c-wide',
  'cleaning-household': 'c-wide',
};

// Order mirrors the prototype's bento packing: big tile first, a wide tile
// beside it, two small tiles to fill the block, then more wide tiles.
const BENTO_ORDER = ['vegetables-fruits', 'grocery-staples', 'stationery', 'personal-care', 'hardware-tools', '__kit__', 'electronics-accessories', 'cleaning-household'];

const KIT_WORDS: [string, ArtKey][] = [
  ['cooking', 'pot'],
  ['fixing', 'screwdriver'],
  ['cleaning', 'bottle'],
  ['hosting', 'chips'],
];
const HOME_WORDS = ['pyaz', 'atta', 'screwdriver', 'chai patti', 'AA batteries', 'haldi'];

const FALLBACK_LAT = 12.9716;
const FALLBACK_LNG = 77.6412;

function pseudoChange(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  const magnitude = 2 + (Math.abs(hash) % 12);
  return hash % 2 === 0 ? magnitude : -magnitude;
}

export function HomeScreen() {
  const storeId = useSessionStore((s) => s.storeId);
  const etaMinutes = useSessionStore((s) => s.etaMinutes);
  const storeName = useSessionStore((s) => s.storeName);
  const sessionLat = useSessionStore((s) => s.lat);
  const sessionLng = useSessionStore((s) => s.lng);
  const setLocation = useSessionStore((s) => s.setLocation);
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const { cart, bill } = useActiveCart();

  const [kitInput, setKitInput] = useState('');
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [addressSheetOpen, setAddressSheetOpen] = useState(false);
  const [minibarOn, setMinibarOn] = useState(false);
  const [startingTokri, setStartingTokri] = useState(false);
  const [copied, setCopied] = useState(false);

  const [rollIdx, setRollIdx] = useState(0);
  const rollRef = useRef<HTMLSpanElement>(null);
  const rollMounted = useRef(false);

  const [kitWordIdx, setKitWordIdx] = useState(0);
  const kitWordRef = useRef<HTMLSpanElement>(null);
  const kitArtRef = useRef<HTMLDivElement>(null);
  const kitMounted = useRef(false);

  const [etaDisplay, setEtaDisplay] = useState<number | null>(null);
  const etaBadgeRef = useRef<HTMLSpanElement>(null);
  const etaShown = useRef(false);

  const categoriesQuery = useQuery({ queryKey: ['categories'], queryFn: listCategories });
  const ordersQuery = useQuery({ queryKey: ['my-orders'], queryFn: listMyOrders });
  const addressesQuery = useQuery({ queryKey: ['addresses'], queryFn: listAddresses });
  const mandiQuery = useQuery({
    queryKey: ['mandi-rates', storeId],
    queryFn: () => listProducts(storeId!, 'vegetables-fruits'),
    enabled: !!storeId,
  });

  async function applyLocation(lat: number, lng: number) {
    const res = await nearestStore(lat, lng);
    if (res.serviceable && res.storeId && res.storeName && res.etaMinutes != null) {
      setLocationError(null);
      setLocation({ storeId: res.storeId, storeName: res.storeName, etaMinutes: res.etaMinutes, lat, lng });
    } else {
      setLocationError('We don’t deliver here yet.');
    }
  }

  function detectLocation() {
    setLocating(true);
    setLocationError(null);
    const settle = (lat: number, lng: number) =>
      applyLocation(lat, lng)
        .catch(() => setLocationError('Could not reach Tokri. Check your connection and try again.'))
        .finally(() => setLocating(false));
    if (!navigator.geolocation) {
      settle(FALLBACK_LAT, FALLBACK_LNG);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => settle(pos.coords.latitude, pos.coords.longitude),
      () => settle(FALLBACK_LAT, FALLBACK_LNG),
      { timeout: 8000 },
    );
  }

  useEffect(() => {
    if (!storeId) detectLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ETA count-up on first load, then a little bump on the badge
  useEffect(() => {
    if (etaMinutes == null || etaShown.current) return;
    etaShown.current = true;
    let n = 1;
    setEtaDisplay(1);
    const iv = setInterval(() => {
      setEtaDisplay(n);
      if (n >= etaMinutes) {
        clearInterval(iv);
        etaBadgeRef.current?.animate(
          [{ transform: 'rotate(-3deg)' }, { transform: 'rotate(4deg) scale(1.08)' }, { transform: 'rotate(-3deg)' }],
          { duration: 420, easing: 'cubic-bezier(.3,1.6,.5,1)' },
        );
      }
      n++;
    }, 40);
    return () => clearInterval(iv);
  }, [etaMinutes]);

  // Search bar rotating word
  useEffect(() => {
    const iv = setInterval(() => {
      const el = rollRef.current;
      if (!el) return;
      el.animate([{ transform: 'translateY(0)', opacity: 1 }, { transform: 'translateY(-100%)', opacity: 0 }], {
        duration: 220,
        easing: 'ease-in',
      }).onfinish = () => setRollIdx((i) => i + 1);
    }, 2400);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    if (!rollMounted.current) {
      rollMounted.current = true;
      return;
    }
    rollRef.current?.animate([{ transform: 'translateY(100%)', opacity: 0 }, { transform: 'none', opacity: 1 }], {
      duration: 300,
      easing: 'cubic-bezier(.2,1.4,.4,1)',
    });
  }, [rollIdx]);

  // Kit card rotating verb + art
  useEffect(() => {
    const iv = setInterval(() => {
      const w = kitWordRef.current;
      const a = kitArtRef.current;
      if (!w || !a) return;
      w.animate([{ transform: 'rotate(-2deg)', opacity: 1 }, { transform: 'rotate(-2deg) translateY(-70%)', opacity: 0 }], {
        duration: 200,
        easing: 'ease-in',
      }).onfinish = () => setKitWordIdx((i) => i + 1);
      a.animate([{ transform: 'rotate(6deg) scale(1)' }, { transform: 'rotate(-160deg) scale(.3)', opacity: 0 }], {
        duration: 230,
        easing: 'ease-in',
      });
    }, 2800);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    if (!kitMounted.current) {
      kitMounted.current = true;
      return;
    }
    kitWordRef.current?.animate([{ transform: 'rotate(-2deg) translateY(70%)', opacity: 0 }, { transform: 'rotate(-2deg)', opacity: 1 }], {
      duration: 340,
      easing: 'cubic-bezier(.2,1.5,.4,1)',
    });
    kitArtRef.current?.animate([{ transform: 'rotate(160deg) scale(.3)', opacity: 0 }, { transform: 'rotate(6deg) scale(1)', opacity: 1 }], {
      duration: 420,
      easing: 'cubic-bezier(.2,1.5,.4,1)',
    });
  }, [kitWordIdx]);

  // Compact sticky header once scrolled past the hero
  useEffect(() => {
    const onScroll = () => setMinibarOn(window.scrollY > 150);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  async function handleReorder(orderId: string) {
    if (!storeId) return;
    const c = await reorder(orderId, storeId);
    router.push(`/cart?cartId=${c.id}`);
  }

  function goKit(prompt: string) {
    router.push(`/kit?prompt=${encodeURIComponent(prompt)}`);
  }

  function startTokri() {
    setStartingTokri(true);
    setTimeout(() => router.push('/tokri/new'), 500);
  }

  async function copyCoupon() {
    try {
      await navigator.clipboard?.writeText('FLAT50');
    } catch {
      // clipboard unavailable, still show the copied state
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  const hour = new Date().getHours();
  const chai = hour >= 16 && hour < 19;
  const ordersForBuyAgain = ordersQuery.data?.slice(0, 6) ?? [];
  const [kitWord, kitArtKey] = KIT_WORDS[kitWordIdx % KIT_WORDS.length];
  const liveTokri = cart && cart.type === 'shared' && cart.status === 'open' ? cart : null;
  const lastItem = liveTokri?.items[liveTokri.items.length - 1];
  const lastMember = lastItem ? liveTokri?.members.find((m) => m.userId === lastItem.addedBy) : undefined;
  const tokriBudget = liveTokri?.budgetCap ?? null;
  const tokriSubtotal = bill?.subtotal ?? 0;
  const mandiRows = (mandiQuery.data ?? []).slice(0, 5);
  const categoriesBySlug = new Map((categoriesQuery.data ?? []).map((c) => [c.slug, c]));
  const orderedSlugs = BENTO_ORDER.filter((slug) => slug === '__kit__' || categoriesBySlug.has(slug));
  const leftoverCategories = (categoriesQuery.data ?? []).filter((c) => !BENTO_ORDER.includes(c.slug));
  const orderedBentoCells: ({ kind: 'kit' } | { kind: 'category'; category: NonNullable<ReturnType<typeof categoriesBySlug.get>> })[] = [
    ...orderedSlugs.map((slug) => (slug === '__kit__' ? { kind: 'kit' as const } : { kind: 'category' as const, category: categoriesBySlug.get(slug)! })),
    ...leftoverCategories.map((category) => ({ kind: 'category' as const, category })),
  ];
  const matchedAddress = addressesQuery.data?.find((a) => a.lat === sessionLat && a.lng === sessionLng);
  const place = matchedAddress?.label ?? (storeName ? 'Delivery' : 'Set location');

  return (
    <div>
      <div className={`minibar ${minibarOn ? 'on' : ''}`}>
        <span className="eta-s">{etaDisplay ?? etaMinutes ?? 12}<small style={{ fontSize: 13 }}> min</small></span>
        <span className="addr-s">{storeName ?? 'Set your location'}</span>
      </div>

      <header className="hhead">
        <div className="hrow">
          <button className="deliver" onClick={() => (storeName ? setAddressSheetOpen(true) : detectLocation())} disabled={locating}>
            <span className="eta-badge" ref={etaBadgeRef}>
              <b>{etaDisplay ?? etaMinutes ?? 12}</b>
              <small>min</small>
            </span>
            <span className="dl-text">
              <span className="dl-to">
                {locating ? 'Locating…' : place}
                <Icon name="chevron-down" />
              </span>
              <span className="dl-addr">{matchedAddress?.line1 ?? storeName ?? locationError ?? 'Tap to find your store'}</span>
            </span>
          </button>
          <div className="avatar" style={{ width: 42, height: 42, borderRadius: '50%', border: '2px solid var(--ink)', background: 'var(--haldi)', color: 'var(--on-accent)', fontWeight: 600, display: 'grid', placeItems: 'center' }}>
            {(user?.name || 'A')[0].toUpperCase()}
          </div>
        </div>

        <Link href="/search" className="searchbar" style={{ display: 'flex', alignItems: 'center', gap: 10, border: '2px solid var(--ink)', borderRadius: 14, padding: '12px 14px', background: 'var(--card)', color: 'var(--muted)' }}>
          <Icon name="search" className="h-5 w-5 text-[var(--ink)]" />
          <span>
            Search for <span className="roller"><span id="rollword" ref={rollRef}>{HOME_WORDS[rollIdx % HOME_WORDS.length]}</span></span>
          </span>
          <span className="sb-mic"><Icon name="mic" /></span>
        </Link>
      </header>

      <section className="kitcard" style={{ margin: '18px 16px 0', padding: '20px 18px 18px', background: 'var(--methi)', color: '#F6F1E7', borderRadius: 18, border: '2px solid var(--ink)', boxShadow: 'var(--shadow)', position: 'relative', overflow: 'hidden' }}>
        <div className="kit-art" ref={kitArtRef}>
          <ProductArt artKey={kitArtKey} />
        </div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 28, lineHeight: 1.08 }}>
          What are you<br />
          <span className="kitword" ref={kitWordRef}>{kitWord}</span> today?
        </h2>
        <p style={{ fontSize: 13.5, opacity: 0.88, marginTop: 10 }}>Tell us the plan. We&rsquo;ll pack the whole list.</p>
        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <input
            value={kitInput}
            onChange={(e) => setKitInput(e.target.value)}
            placeholder="aloo ki sabzi for 4"
            aria-label="Describe what you're making"
            style={{ flex: 1, minWidth: 0, border: '2px solid #1B1A17', borderRadius: 12, padding: '10px 12px', background: '#FFFDF8', color: '#1B1A17' }}
          />
          <button className="btn primary" style={{ padding: '10px 14px', boxShadow: '3px 3px 0 #1B1A17', borderColor: '#1B1A17' }} onClick={() => goKit(kitInput || 'Aloo ki sabzi for 4')}>
            Make my list
          </button>
        </div>
        <div className="kitchips">
          {[['Paneer butter masala', 11], ['Fix a leaking tap', 6], ['Science fair volcano', 8], ['House party for 10', 12], ['Laptop not charging', 9]].map(([t, n]) => (
            <button key={t} className="chip" style={{ background: 'transparent', borderColor: '#F6F1E7', color: '#F6F1E7' }} onClick={() => goKit(String(t))}>
              {t}<b>{n}</b>
            </button>
          ))}
        </div>
      </section>

      {liveTokri && lastItem && lastMember ? (
        <button className="livetokri" onClick={() => router.push(`/tokri/${liveTokri.id}`)}>
          <div className="lt-top">
            <span className="livedot" />
            Live Tokri
            <div className="avs">
              {liveTokri.members.map((m) => (
                <span key={m.userId} className="av" style={{ width: 26, height: 26, borderRadius: '50%', border: '2px solid #1B1A17', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 600, background: m.color }}>
                  {m.name[0]}
                </span>
              ))}
            </div>
          </div>
          <h3>{liveTokri.name ?? 'Shared Tokri'}</h3>
          <p className="small">
            {lastMember.name} added {lastItem.name.toLowerCase()}. {liveTokri.members.length} people are in.
          </p>
          {tokriBudget ? (
            <div className="bar"><i style={{ width: `${Math.min(100, (tokriSubtotal / tokriBudget) * 100)}%` }} /></div>
          ) : null}
          <div className="row between small" style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span><b className="mono">₹{tokriSubtotal}</b>{tokriBudget ? ` of ₹${tokriBudget}` : ''}</span>
            <b>Open Tokri</b>
          </div>
        </button>
      ) : null}

      <button className={`newtokri-btn ${startingTokri ? 'go' : ''}`} onClick={startTokri} disabled={startingTokri}>
        <span className="nt-plus"><Icon name="plus" /></span>
        <span className="nt-text">
          <b>Start a new Tokri</b>
          <span>Shop together, pay once.</span>
        </span>
        <span className="nt-seats"><i /><i /><i /></span>
      </button>

      <h2 className="sec" style={{ margin: '26px 16px 12px' }}>Shop by category</h2>
      <div className="bento">
        {orderedBentoCells.map((cell) => {
          if (cell.kind === 'kit') {
            return (
              <Link key="kit" href="/kit" className="cat c-kits">
                <span className="dv font-devanagari">किट</span>
                <span className="cat-label">Make a kit</span>
                <ProductArt artKey="pot" />
              </Link>
            );
          }
          const c = cell.category;
          const tint = CATEGORY_TINT[c.slug] ?? 'dust';
          const span = BENTO_SPAN[c.slug] ?? '';
          return (
            <Link key={c.id} href={`/category/${c.slug}`} className={`cat t-${tint} ${span}`}>
              {c.hindiName && <span className="dv font-devanagari">{c.hindiName}</span>}
              {span === 'c-big' && <span className="fresh-note">From the mandi at 5 am</span>}
              <span className="cat-label">{c.name}</span>
              <ProductArt artKey={artKeyFor(c.name, c.slug)} tint={tint} />
            </Link>
          );
        })}
      </div>

      {mandiRows.length > 0 && (
        <section className="mandi">
          <header>
            <h3><span className="deva font-devanagari">आज के भाव</span>Today&rsquo;s sabzi rates</h3>
            <span>Change since yesterday<br />Updated 6:10 am</span>
          </header>
          {mandiRows.map((p) => (
            <MandiRow key={p.id} product={p} change={pseudoChange(p.id)} />
          ))}
        </section>
      )}

      <button className="ticket" onClick={copyCoupon}>
        <span className="stub"><b>₹50</b><span>OFF</span></span>
        <span className="tbody">
          <b>Flat ₹50 off above ₹499</b>
          <span className="small muted">Great for a shared Tokri. Tap to copy.</span>
          <code className={copied ? 'copied' : ''}>{copied ? 'Copied' : 'FLAT50'}</code>
        </span>
      </button>

      {!!ordersForBuyAgain.length && (
        <>
          <h2 className="sec" style={{ margin: '26px 16px 12px' }}>{chai ? 'Chai time? Biscuits are 8 min away' : 'Buy again'}</h2>
          <div className="hscroll" style={{ padding: '0 16px 6px' }}>
            {ordersForBuyAgain.map((o) => (
              <div key={o.id} className="pcard" style={{ width: 150, flex: 'none' }}>
                <div className="card" style={{ padding: 10 }}>
                  <p className="small" style={{ color: 'var(--muted)' }}>{new Date(o.createdAt).toLocaleDateString()}</p>
                  <p style={{ fontSize: 13, fontWeight: 600, marginTop: 4 }}>
                    {o.cart.items.slice(0, 2).map((i) => i.variant.product.name).join(', ')}
                    {o.cart.items.length > 2 ? '…' : ''}
                  </p>
                  <button className="btn block" style={{ marginTop: 8, padding: '6px 10px', fontSize: 13 }} onClick={() => handleReorder(o.id)}>
                    Reorder
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <footer className="hfoot">
        <span className="deva font-devanagari">टोकरी</span>
        <p>Made for flats that share.</p>
      </footer>

      {addressSheetOpen && <AddressSheet onClose={() => setAddressSheetOpen(false)} />}
    </div>
  );
}

function MandiRow({ product, change }: { product: ProductDto; change: number }) {
  const { qtyByVariant, addItem, updateItem, removeItem } = useActiveCart();
  const variant = product.variants[0];
  const entry = variant ? qtyByVariant[variant.id] : undefined;
  const qty = entry?.qty ?? 0;
  const router = useRouter();

  return (
    <div className="mrate">
      <button className={`ptile t-${product.tileColor}`} onClick={() => router.push(`/product/${product.id}`)} aria-label={product.name}>
        <ProductArt artKey={artKeyFor(product.name, product.category.slug)} tint={product.tileColor} />
      </button>
      <div>
        <div className="nm">{product.name}</div>
        <span className={`chg ${change < 0 ? 'down' : 'up'}`}>{change < 0 ? '▼' : '▲'} ₹{Math.abs(change)}</span>
      </div>
      <div className="p">
        ₹{variant?.price ?? 0}
        <br />
        <span style={{ fontWeight: 400, opacity: 0.6 }}>per {product.unit}</span>
      </div>
      {variant && (
        <QuantityStepper
          qty={qty}
          onAdd={() => addItem.mutate({ variantId: variant.id, qty: 1 })}
          onIncrement={() => (entry ? updateItem.mutate({ itemId: entry.itemId, qty: qty + 1 }) : addItem.mutate({ variantId: variant.id, qty: 1 }))}
          onDecrement={() => entry && (qty <= 1 ? removeItem.mutate(entry.itemId) : updateItem.mutate({ itemId: entry.itemId, qty: qty - 1 }))}
        />
      )}
    </div>
  );
}
