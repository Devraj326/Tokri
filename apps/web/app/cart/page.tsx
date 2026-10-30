'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useActiveCart } from '../../lib/hooks/use-active-cart';
import { useSessionStore } from '../../lib/store/session';
import { createSharedCart, addCartItem, applyCoupon, removeCoupon, type CartItemDto } from '../../lib/api/cart';
import { listAddresses } from '../../lib/api/addresses';
import { listProducts } from '../../lib/api/catalog';
import { AppBar } from '../../components/layout/app-bar';
import { AddressSheet } from '../../components/ui/address-sheet';
import { QuantityStepper } from '../../components/ui/quantity-stepper';
import { ProductArt, artKeyFor } from '../../components/ui/product-art';
import { Icon } from '../../components/ui/icons';

const DELIVERY_FEE = 25;

const SWIPE_INTENT_PX = 10;

function SwipeRow({ onRemove, children }: { onRemove: () => void; children: ReactNode }) {
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const start = useRef<{ x: number; y: number; pointerId: number } | null>(null);
  const locked = useRef<'horizontal' | 'vertical' | null>(null);
  const THRESHOLD = -72;

  function onPointerDown(e: React.PointerEvent) {
    start.current = { x: e.clientX, y: e.clientY, pointerId: e.pointerId };
    locked.current = null;
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!start.current) return;
    const dxRaw = e.clientX - start.current.x;
    const dyRaw = e.clientY - start.current.y;

    if (locked.current === null) {
      if (Math.abs(dxRaw) < SWIPE_INTENT_PX && Math.abs(dyRaw) < SWIPE_INTENT_PX) return;
      if (Math.abs(dyRaw) > Math.abs(dxRaw)) {
        locked.current = 'vertical';
        start.current = null;
        return;
      }
      locked.current = 'horizontal';
      setDragging(true);
      (e.currentTarget as HTMLElement).setPointerCapture(start.current.pointerId);
    }
    if (locked.current !== 'horizontal') return;
    setDx(Math.max(-100, Math.min(0, dxRaw)));
  }
  function onPointerUp() {
    if (locked.current === 'horizontal') {
      setDragging(false);
      if (dx < THRESHOLD) onRemove();
      else setDx(0);
    }
    start.current = null;
    locked.current = null;
  }

  return (
    <div style={{ position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'var(--mirchi)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '0 20px', fontWeight: 600, fontSize: 13 }}>
        Remove
      </div>
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{ position: 'relative', background: 'var(--paper)', transform: `translateX(${dx}px)`, transition: dragging ? 'none' : 'transform .25s', touchAction: 'pan-y' }}
      >
        {children}
      </div>
    </div>
  );
}

export default function CartPage() {
  const router = useRouter();
  const etaMinutes = useSessionStore((s) => s.etaMinutes);
  const setActiveCart = useSessionStore((s) => s.setActiveCart);
  const { cart, bill, updateItem, removeItem, addItem } = useActiveCart();
  const [converting, setConverting] = useState(false);
  const [showAddress, setShowAddress] = useState(false);
  const [saved, setSaved] = useState<CartItemDto[]>([]);
  const [couponInput, setCouponInput] = useState('');
  const [couponError, setCouponError] = useState('');
  const qc = useQueryClient();

  const applyCouponMutation = useMutation({
    mutationFn: (code: string) => applyCoupon(cart!.id, code),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cart'] });
      qc.invalidateQueries({ queryKey: ['cart-bill'] });
      setCouponInput('');
      setCouponError('');
    },
    onError: (err: any) => setCouponError(err?.message ?? 'Could not apply this coupon'),
  });

  const removeCouponMutation = useMutation({
    mutationFn: () => removeCoupon(cart!.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cart'] });
      qc.invalidateQueries({ queryKey: ['cart-bill'] });
    },
  });

  useEffect(() => {
    if (cart?.type === 'shared') router.replace(`/tokri/${cart.id}`);
  }, [cart?.type, cart?.id, router]);

  const addressesQuery = useQuery({ queryKey: ['addresses'], queryFn: listAddresses });
  const primaryAddress = addressesQuery.data?.[0];

  const crossSellCategory = useMemo(() => {
    if (!cart || cart.items.length === 0) return null;
    const counts = new Map<string, number>();
    for (const item of cart.items) counts.set(item.categorySlug, (counts.get(item.categorySlug) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
  }, [cart]);

  const crossSellQuery = useQuery({
    queryKey: ['cross-sell', cart?.storeId, crossSellCategory],
    queryFn: () => listProducts(cart!.storeId, crossSellCategory!, { limit: 30 }),
    enabled: !!cart?.storeId && !!crossSellCategory,
  });

  const missed = useMemo(() => {
    if (!cart) return [];
    const inCart = new Set(cart.items.map((i) => i.variantId));
    return (crossSellQuery.data?.items ?? [])
      .flatMap((p) => p.variants.map((v) => ({ product: p, variant: v })))
      .filter(({ variant }) => !inCart.has(variant.id) && variant.qtyAvailable > 0)
      .slice(0, 6);
  }, [cart, crossSellQuery.data]);

  async function makeShared() {
    if (!cart) return;
    setConverting(true);
    try {
      const shared = await createSharedCart(cart.storeId, `${cart.items.length ? 'Our' : 'New'} Tokri`);
      for (const item of cart.items) {
        await addCartItem(shared.id, item.variantId, item.qty, item.note ?? undefined);
      }
      setActiveCart(shared.id);
      router.push(`/tokri/${shared.id}`);
    } finally {
      setConverting(false);
    }
  }

  function saveForLater(item: CartItemDto) {
    setSaved((s) => [item, ...s]);
    removeItem.mutate(item.id);
  }
  function moveToCart(item: CartItemDto) {
    setSaved((s) => s.filter((i) => i.id !== item.id));
    addItem.mutate({ variantId: item.variantId, qty: item.qty, note: item.note ?? undefined });
  }

  const savedBlock = saved.length > 0 && (
    <section className="sblock">
      <header>
        <h3>Saved for later</h3>
        <span className="small muted">{saved.length}</span>
      </header>
      {saved.map((item) => (
        <div key={item.id} className="crow">
          <div className="ptile t-dust" style={{ padding: 7, borderRadius: 9 }}>
            <ProductArt artKey={artKeyFor(item.name)} />
          </div>
          <div>
            <h4 style={{ fontSize: 14.5, fontWeight: 600, lineHeight: 1.25 }}>{item.name}</h4>
            <span className="small muted">₹{item.price}</span>
          </div>
          <button className="addbtn" onClick={() => moveToCart(item)}>Move to cart</button>
        </div>
      ))}
    </section>
  );

  if (cart?.type === 'shared') return null;

  if (!cart || cart.items.length === 0) {
    return (
      <>
        <AppBar title="Your cart" backHref="/" />
        <div className="empty" style={{ padding: '50px 26px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
          <svg viewBox="0 0 200 150" style={{ width: 190 }} aria-hidden>
            <path d="M30 70h140l-14 70H44z" fill="#C9714A" stroke="currentColor" strokeWidth={3} strokeLinejoin="round" />
            <path d="M44 90h112M48 110h104" stroke="currentColor" strokeWidth={2} opacity={0.5} />
            <ellipse cx="100" cy="60" rx="32" ry="26" fill="#D3A464" stroke="currentColor" strokeWidth={3} />
            <circle cx="90" cy="56" r="6" fill="#fff" stroke="currentColor" strokeWidth={2} />
            <circle cx="110" cy="56" r="6" fill="#fff" stroke="currentColor" strokeWidth={2} />
            <circle cx="91" cy="58" r="2.5" fill="currentColor" />
            <circle cx="111" cy="58" r="2.5" fill="currentColor" />
          </svg>
          <h2 className="font-display" style={{ fontSize: 30 }}>Kuch toh le lo.</h2>
          <p className="small" style={{ color: 'var(--muted)' }}>Your cart is empty. Aloo is lonely in here.</p>
          <button className="btn primary" onClick={() => router.push('/')}>Start shopping</button>
        </div>
        {savedBlock}
      </>
    );
  }

  const mrpTotal = cart.items.reduce((a, i) => a + i.mrp * i.qty, 0);
  const itemSavings = Math.max(0, mrpTotal - (bill?.subtotal ?? 0));
  const deliverySavings = bill && bill.deliveryFee === 0 ? DELIVERY_FEE : 0;
  const totalSavings = itemSavings + deliverySavings;
  const pct = bill ? Math.min(100, (bill.subtotal / bill.freeDeliveryThreshold) * 100) : 0;

  return (
    <>
      <AppBar
        title="Your cart"
        backHref="/"
        right={<span className="ccount">{cart.items.length} item{cart.items.length > 1 ? 's' : ''}</span>}
      />

      <button className="cstrip" onClick={() => setShowAddress(true)}>
        <span className="eta-mini"><b>{etaMinutes ?? 12}</b><small>min</small></span>
        <span className="cs-t">
          <b>Delivering to {primaryAddress?.label ?? 'your address'}</b>
          <small>{primaryAddress?.line1 ?? 'Set your delivery address'}</small>
        </span>
        <span className="link small">Change</span>
      </button>

      {totalSavings > 0 && (
        <div className="saveband">
          <span>You&rsquo;re saving</span>
          <b>₹{totalSavings}</b>
          <span>on this order</span>
        </div>
      )}

      {bill && (
        <section className="card miles">
          <p>
            {bill.deliveryFee === 0 ? (
              'Free delivery unlocked on this order'
            ) : (
              <>Add <b>₹{bill.amountToFreeDelivery}</b> more for free delivery</>
            )}
          </p>
          <div className="mtrack">
            <i className="mfill" style={{ width: `${pct}%` }} />
            <span className={`mstop ${bill.deliveryFee === 0 ? 'hit' : ''}`} style={{ left: '100%' }}>
              <Icon name="scooter" className="h-4 w-4" />
            </span>
          </div>
          <div className="mlabels">
            <span style={{ left: '100%' }}>Free delivery</span>
          </div>
        </section>
      )}

      <section className="card citems">
        <header>
          <b>Items</b>
          <span className="small muted">Swipe left to remove</span>
        </header>
        {cart.items.map((item) => (
          <SwipeRow key={item.id} onRemove={() => removeItem.mutate(item.id)}>
            <div className="crow">
              <div className="ptile t-dust" style={{ padding: 7, borderRadius: 9 }}>
                <ProductArt artKey={artKeyFor(item.name)} />
              </div>
              <div>
                <h4 style={{ fontSize: 14.5, fontWeight: 600, lineHeight: 1.25 }}>{item.name}</h4>
                <div className="price">
                  ₹{item.price * item.qty}{item.mrp > item.price && <s style={{ marginLeft: 6 }}>₹{item.mrp * item.qty}</s>}
                </div>
                <button className="link tiny" onClick={() => saveForLater(item)}>Save for later</button>
              </div>
              <QuantityStepper
                qty={item.qty}
                onAdd={() => {}}
                onIncrement={() => updateItem.mutate({ itemId: item.id, qty: item.qty + 1 })}
                onDecrement={() => (item.qty <= 1 ? removeItem.mutate(item.id) : updateItem.mutate({ itemId: item.id, qty: item.qty - 1 }))}
              />
            </div>
          </SwipeRow>
        ))}
      </section>

      {missed.length > 0 && (
        <section className="sblock">
          <header><h3>Did you forget?</h3></header>
          <div className="minis">
            {missed.map(({ product, variant }) => (
              <div className="mini" key={variant.id}>
                <div className="ptile t-dust">
                  <ProductArt artKey={artKeyFor(product.name)} />
                </div>
                <span className="mn">{product.name}</span>
                <span className="price" style={{ fontSize: 12.5 }}>₹{variant.price}</span>
                <button className="miniadd" aria-label={`Add ${product.name}`} onClick={() => addItem.mutate({ variantId: variant.id, qty: 1 })}>+</button>
              </div>
            ))}
          </div>
        </section>
      )}

      <button className="tkcta" disabled={converting} onClick={makeShared}>
        <span className="avs" style={{ display: 'flex' }}>
          <span className="av" style={{ width: 26, height: 26, fontSize: 11, borderRadius: '50%', border: '2px solid var(--ink)', display: 'grid', placeItems: 'center', fontWeight: 600, background: 'var(--haldi)', color: 'var(--on-accent)' }}>Y</span>
        </span>
        <span>
          <b>Shopping with your flat?</b>
          <small>{converting ? 'Converting…' : 'Turn this cart into a shared Tokri'}</small>
        </span>
        <Icon name="arrow" className="h-5 w-5" />
      </button>

      {cart && (
        <section className="card bill2">
          <h3>Coupon</h3>
          {cart.couponCode ? (
            <div className="l">
              <span>
                <b>{cart.couponCode}</b> applied
              </span>
              <button className="link small" disabled={removeCouponMutation.isPending} onClick={() => removeCouponMutation.mutate()}>
                Remove
              </button>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  className="input"
                  placeholder="Enter coupon code"
                  value={couponInput}
                  onChange={(e) => {
                    setCouponInput(e.target.value.toUpperCase());
                    setCouponError('');
                  }}
                  style={{ flex: 1 }}
                />
                <button
                  className="btn"
                  disabled={!couponInput || applyCouponMutation.isPending}
                  onClick={() => applyCouponMutation.mutate(couponInput)}
                >
                  Apply
                </button>
              </div>
              {couponError && <p className="small" style={{ color: 'var(--mirchi)', marginTop: 6 }}>{couponError}</p>}
              <Link href="/coupons" className="small" style={{ color: 'var(--mirchi)', display: 'block', marginTop: 8 }}>
                View all offers
              </Link>
            </>
          )}
        </section>
      )}

      {bill && (
        <section className="card bill2">
          <h3>Bill details</h3>
          <div className="l">
            <span>Item total</span>
            <span>{mrpTotal > bill.subtotal && <s>₹{mrpTotal}</s>} ₹{bill.subtotal}</span>
          </div>
          <div className="l">
            <span>Delivery fee</span>
            <span>{bill.deliveryFee === 0 ? <><s>₹{DELIVERY_FEE}</s> <b className="saved">Free</b></> : `₹${bill.deliveryFee}`}</span>
          </div>
          {bill.discount > 0 && (
            <div className="l">
              <span>Coupon discount{bill.couponCode ? ` (${bill.couponCode})` : ''}</span>
              <span className="saved">−₹{bill.discount}</span>
            </div>
          )}
          <div className="l tot">
            <span>To pay</span>
            <span>₹{bill.total}</span>
          </div>
        </section>
      )}

      <p className="policy">You can cancel for free until your order is packed. Fresh items can be returned within 48 hours.</p>

      {savedBlock}

      <div style={{ height: 16 }} />

      <div className="buybar cbar">
        <div>
          <span className="small" style={{ color: 'var(--muted)' }}>To pay</span>
          <div className="price" style={{ fontSize: 19 }}>₹{bill?.total ?? 0}</div>
          {totalSavings > 0 && <span className="saved">Saving ₹{totalSavings}</span>}
        </div>
        <button className="btn primary" onClick={() => router.push(`/checkout?cartId=${cart.id}`)}>
          Checkout <Icon name="arrow" className="h-[18px] w-[18px]" />
        </button>
      </div>

      {showAddress && <AddressSheet onClose={() => setShowAddress(false)} />}
    </>
  );
}
