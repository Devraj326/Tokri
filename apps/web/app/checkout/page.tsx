'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getCart, getBill, getShares, lockCart } from '../../lib/api/cart';
import { createOrder, createRazorpayOrder, verifyPayment, listMyOrders, getOrder, type PaymentDto } from '../../lib/api/orders';
import { ApiError } from '../../lib/api/client';
import { listAddresses, createAddress, type AddressDto } from '../../lib/api/users';
import { useAuthStore } from '../../lib/store/auth';
import { useSessionStore } from '../../lib/store/session';
import { openRazorpayCheckout } from '../../lib/razorpay';
import { AppBar } from '../../components/layout/app-bar';
import { AddressSheet } from '../../components/ui/address-sheet';
import { Icon } from '../../components/ui/icons';

const TIPS = [0, 10, 20, 30, 50];
const UPI_APPS = ['GPay', 'PhonePe', 'Paytm', 'BHIM'];
const SPLIT_LABELS: Record<string, string> = {
  host_pays_all: 'you pay',
  pay_for_own: 'own items',
  split_equally: 'equally',
  custom: 'custom amounts',
};

const MINIMAP = (
  <svg viewBox="0 0 64 64" aria-hidden style={{ width: '100%', height: '100%' }}>
    <rect width="64" height="64" fill="var(--dust)" />
    <path d="M0 20h64M0 44h64M22 0v64M46 0v64" stroke="var(--paper)" strokeWidth={6} />
    <path d="M32 40s-9-8-9-15a9 9 0 0118 0c0 7-9 15-9 15z" fill="var(--mirchi)" stroke="#1B1A17" strokeWidth={2} />
    <circle cx="32" cy="25" r="3" fill="#fff" />
  </svg>
);

function upiLooksValid(v: string) {
  return /^[\w.-]{2,}@[a-z]{2,}$/i.test(v);
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={null}>
      <CheckoutPageInner />
    </Suspense>
  );
}

function CheckoutPageInner() {
  const router = useRouter();
  const params = useSearchParams();
  const cartId = params.get('cartId');
  const user = useAuthStore((s) => s.user);
  const { lat, lng, storeName } = useSessionStore();
  const setActiveCart = useSessionStore((s) => s.setActiveCart);
  const qc = useQueryClient();

  const cartQuery = useQuery({ queryKey: ['cart', cartId], queryFn: () => getCart(cartId!), enabled: !!cartId });
  const billQuery = useQuery({ queryKey: ['cart-bill', cartId], queryFn: () => getBill(cartId!), enabled: !!cartId });
  const sharesQuery = useQuery({ queryKey: ['cart-shares', cartId], queryFn: () => getShares(cartId!), enabled: !!cartId && cartQuery.data?.type === 'shared' });
  const addressesQuery = useQuery({ queryKey: ['addresses'], queryFn: listAddresses });

  const [selectedAddress, setSelectedAddress] = useState<AddressDto | null>(null);
  const [showAddress, setShowAddress] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [slot, setSlot] = useState<'now' | 's1' | 's2' | 's3'>('now');
  const [inst, setInst] = useState({ bell: false, door: true, call: false, pets: false });
  const [note, setNote] = useState('');
  const [tip, setTip] = useState(0);
  const [pay, setPay] = useState<'upi' | 'card' | 'cod'>('upi');
  const [upiApp, setUpiApp] = useState('GPay');
  const [upiId, setUpiId] = useState('');
  const [upiOk, setUpiOk] = useState(false);
  const [upiMsg, setUpiMsg] = useState('');
  const [cvv, setCvv] = useState('');
  const [cvvError, setCvvError] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);

  const sliderRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const cvvRef = useRef<HTMLInputElement>(null);
  const dragState = useRef<{ x0: number | null; x: number }>({ x0: null, x: 0 });

  useEffect(() => {
    async function ensureAddress() {
      if (addressesQuery.data && addressesQuery.data.length > 0) {
        setSelectedAddress((prev) => prev ?? addressesQuery.data[0]);
      } else if (addressesQuery.data && addressesQuery.data.length === 0 && lat && lng) {
        const created = await createAddress({ label: 'Home', lat, lng, line1: storeName ? `Near ${storeName}` : 'My location' });
        setSelectedAddress(created);
      }
    }
    ensureAddress();
  }, [addressesQuery.data, lat, lng, storeName]);

  useEffect(() => {
    if (!addressesQuery.data || lat == null || lng == null) return;
    const match = addressesQuery.data.find((a) => a.lat === lat && a.lng === lng);
    if (match) setSelectedAddress(match);
  }, [lat, lng, addressesQuery.data]);

  function verifyUpi() {
    if (upiLooksValid(upiId)) {
      setUpiOk(true);
      setUpiMsg('');
    } else {
      setUpiOk(false);
      setUpiMsg('That doesn’t look like a UPI ID. Try name@bank.');
    }
  }

  async function placeOrder() {
    if (!cartId || !user) return;
    if (pay === 'card' && cvv.length < 3) {
      setCvvError(true);
      cvvRef.current?.focus();
      resetSlider();
      return;
    }
    setPlacing(true);
    setOrderError(null);
    try {
      let orderId: string;
      let payments: PaymentDto[];
      try {
        try {
          await lockCart(cartId);
        } catch (err) {
          if (!(err instanceof ApiError && err.message.includes('already locked'))) throw err;
        }
        const created = await createOrder(cartId);
        orderId = created.order.id;
        payments = created.payments;
      } catch (err) {
        // The cart may already be in 'ordered' state from a prior attempt whose
        // payment failed or was cancelled — resume that order instead of failing.
        if (err instanceof ApiError && /lock the cart/i.test(err.message)) {
          const mine = await listMyOrders();
          const existing = mine.find((o) => o.cartId === cartId);
          if (!existing) throw err;
          orderId = existing.id;
          payments = (await getOrder(orderId)).payments;
        } else {
          throw err;
        }
      }

      const myPayment = payments.find((p) => p.payerId === user.id);
      if (pay !== 'cod' && myPayment && myPayment.status !== 'paid') {
        const rpOrder = await createRazorpayOrder(myPayment.id);
        if (!rpOrder.mocked) {
          await openRazorpayCheckout({
            key: rpOrder.keyId!,
            amount: rpOrder.amount!,
            currency: rpOrder.currency!,
            order_id: rpOrder.razorpayOrderId!,
            name: 'Tokri',
            description: 'Order payment',
            prefill: { contact: user.phone ?? undefined, name: user.name ?? undefined },
            theme: { color: '#F2B705' },
            handler: async (response) => {
              await verifyPayment(myPayment.id, {
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              });
            },
          });
        }
      }

      setActiveCart(null);
      router.push(`/orders/${orderId}`);
    } catch (err) {
      setOrderError(err instanceof Error ? err.message : 'Something went wrong, please try again');
      resetSlider();
    } finally {
      setPlacing(false);
    }
  }

  function resetSlider() {
    const knob = knobRef.current;
    const text = textRef.current;
    const slider = sliderRef.current;
    if (!knob || !text) return;
    dragState.current.x = 0;
    knob.style.transform = '';
    text.style.opacity = '1';
    text.textContent = pay === 'cod' ? 'Slide to place order' : `Slide to pay ₹${Math.round(due)}`;
    slider?.classList.remove('done');
  }

  useEffect(() => {
    const knob = knobRef.current;
    const slider = sliderRef.current;
    const text = textRef.current;
    if (!knob || !slider || !text) return;
    const maxX = () => slider.clientWidth - knob.offsetWidth - 8;

    const onDown = (e: PointerEvent) => {
      dragState.current.x0 = e.clientX - dragState.current.x;
      knob.setPointerCapture(e.pointerId);
      knob.classList.add('dragging');
    };
    const onMove = (e: PointerEvent) => {
      if (dragState.current.x0 === null) return;
      const x = Math.max(0, Math.min(maxX(), e.clientX - dragState.current.x0));
      dragState.current.x = x;
      knob.style.transform = `translateX(${x}px)`;
      text.style.opacity = String(1 - (x / maxX()) * 0.9);
    };
    const onUp = () => {
      if (dragState.current.x0 === null) return;
      dragState.current.x0 = null;
      knob.classList.remove('dragging');
      if (dragState.current.x > maxX() * 0.82) {
        slider.classList.add('done');
        knob.style.transform = `translateX(${maxX()}px)`;
        text.textContent = pay === 'cod' ? 'Placing order…' : 'Paying…';
        text.style.opacity = '1';
        setTimeout(placeOrder, 450);
      } else {
        resetSlider();
      }
    };
    knob.addEventListener('pointerdown', onDown);
    knob.addEventListener('pointermove', onMove);
    knob.addEventListener('pointerup', onUp);
    return () => {
      knob.removeEventListener('pointerdown', onDown);
      knob.removeEventListener('pointermove', onMove);
      knob.removeEventListener('pointerup', onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartId, pay, cvv]);

  const cart = cartQuery.data;
  const bill = billQuery.data;
  const isShared = cart?.type === 'shared';
  const myShare = isShared ? sharesQuery.data?.find((s) => s.userId === user?.id)?.amount ?? 0 : bill?.total ?? 0;
  const due = (isShared && cart?.splitMode !== 'host_pays_all' ? myShare : bill?.total ?? 0) + tip;
  const mrpTotal = cart?.items.reduce((a, i) => a + i.mrp * i.qty, 0) ?? 0;

  const SLOTS: { key: typeof slot; a: string; c: string }[] = [
    { key: 'now', a: 'Now', c: '12 min' },
    { key: 's1', a: 'Today', c: '7–8 pm' },
    { key: 's2', a: 'Today', c: '8–9 pm' },
    { key: 's3', a: 'Tomorrow', c: '7–9 am' },
  ];
  const INSTS: { key: keyof typeof inst; label: string; icon: 'bell' | 'door' | 'phone' | 'paw' }[] = [
    { key: 'bell', label: 'Don’t ring the bell', icon: 'bell' },
    { key: 'door', label: 'Leave at the door', icon: 'door' },
    { key: 'call', label: 'Call when you arrive', icon: 'phone' },
    { key: 'pets', label: 'Pets at home', icon: 'paw' },
  ];

  return (
    <>
      <AppBar title="Checkout" backHref={cart?.type === 'shared' ? `/tokri/${cartId}` : '/cart'} />

      <ol className="costeps">
        <li className="done"><span><Icon name="check" className="h-[13px] w-[13px]" /></span>Cart</li>
        <li className="now"><span>2</span>Details</li>
        <li><span>3</span>Pay</li>
      </ol>

      <section className="pblock addrcard" style={{ margin: '16px 16px 0' }}>
        <span className="minimap">{MINIMAP}</span>
        <div>
          <span className="small muted">Deliver to</span>
          <b>{selectedAddress?.label ?? 'Locating…'}</b>
          <p className="small">{selectedAddress?.line1}</p>
        </div>
        <button className="link small" onClick={() => setShowAddress(true)}>Change</button>
      </section>

      <section className="pblock" style={{ margin: '16px 16px 0' }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 17, marginBottom: 10 }}>When</h3>
        <div className="slots">
          {SLOTS.map((s) => (
            <button key={s.key} className="slot" aria-pressed={slot === s.key} onClick={() => setSlot(s.key)}>
              {s.key === 'now' && <span className="fast">Fastest</span>}
              <small>{s.a}</small>
              <b>{s.c}</b>
            </button>
          ))}
        </div>
      </section>

      <section className="pblock" style={{ margin: '16px 16px 0' }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 17, marginBottom: 10 }}>Delivery instructions</h3>
        <div className="insts">
          {INSTS.map((it) => (
            <button key={it.key} className="inst" aria-pressed={inst[it.key]} onClick={() => setInst((s) => ({ ...s, [it.key]: !s[it.key] }))}>
              <Icon name={it.icon} className="h-5 w-5" />
              <span>{it.label}</span>
            </button>
          ))}
        </div>
        <textarea
          className="field note"
          placeholder="Anything else for the rider? A landmark or gate code"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </section>

      <section className="pblock" style={{ margin: '16px 16px 0' }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 17, marginBottom: 4 }}>Tip your rider</h3>
        <p className="small muted" style={{ margin: '-4px 0 10px' }}>Every rupee goes to your rider.</p>
        <div className="tips">
          {TIPS.map((t) => (
            <button key={t} className="tipc" aria-pressed={tip === t} onClick={() => setTip(t)}>
              {t ? `₹${t}` : 'Not now'}
              {t === 20 && <small>Most tipped</small>}
            </button>
          ))}
        </div>
      </section>

      <section className="pblock" style={{ margin: '16px 16px 0' }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 17, marginBottom: 6 }}>Pay with</h3>

        <div className={`payopt ${pay === 'upi' ? 'on' : ''}`}>
          <button className="opt" role="radio" aria-checked={pay === 'upi'} onClick={() => setPay('upi')}>
            <span className="radio" />
            <span><b>UPI</b><br /><span className="small muted">{upiOk ? upiId : `Pay with ${upiApp} or any UPI app`}</span></span>
          </button>
          {pay === 'upi' && (
            <div className="paybody">
              <div className="chips">
                {UPI_APPS.map((a) => (
                  <button key={a} className="chip" aria-pressed={upiApp === a} onClick={() => setUpiApp(a)}>{a}</button>
                ))}
              </div>
              <p className="small muted" style={{ margin: '12px 0 6px' }}>Or pay with a UPI ID</p>
              <div className="upirow">
                <input
                  className="field"
                  placeholder="name@bank"
                  value={upiId}
                  autoComplete="off"
                  onChange={(e) => {
                    setUpiId(e.target.value);
                    setUpiOk(false);
                    setUpiMsg('');
                  }}
                />
                <button className="btn" onClick={verifyUpi}>Verify</button>
              </div>
              {upiOk && <p className="small" style={{ marginTop: 6 }}><span className="saved">Verified</span></p>}
              {upiMsg && <p className="small" style={{ marginTop: 6, color: 'var(--mirchi)', fontWeight: 600 }}>{upiMsg}</p>}
            </div>
          )}
        </div>

        <div className={`payopt ${pay === 'card' ? 'on' : ''}`}>
          <button className="opt" role="radio" aria-checked={pay === 'card'} onClick={() => setPay('card')}>
            <span className="radio" />
            <span><b>Card</b><br /><span className="small muted">Saved card ending 4242</span></span>
          </button>
          {pay === 'card' && (
            <div className="paybody">
              <div className="ccard">
                <span className="small" style={{ opacity: 0.7 }}>Saved card</span>
                <span className="tabular-price" style={{ fontSize: 16, letterSpacing: '.08em' }}>•••• •••• •••• 4242</span>
                <span className="small">Expires 08/29</span>
              </div>
              <label className="lbl" htmlFor="cvv" style={{ marginTop: 12 }}>CVV</label>
              <input
                ref={cvvRef}
                id="cvv"
                className={`field cvv ${cvvError ? 'error' : ''}`}
                inputMode="numeric"
                maxLength={3}
                placeholder="•••"
                value={cvv}
                onChange={(e) => {
                  setCvv(e.target.value.replace(/\D/g, ''));
                  setCvvError(false);
                }}
              />
              {cvvError && <p className="small" style={{ marginTop: 6, color: 'var(--mirchi)', fontWeight: 600 }}>Enter your card CVV first</p>}
            </div>
          )}
        </div>

        <div className={`payopt ${pay === 'cod' ? 'on' : ''}`}>
          <button className="opt" role="radio" aria-checked={pay === 'cod'} onClick={() => setPay('cod')}>
            <span className="radio" />
            <span><b>Cash on delivery</b><br /><span className="small muted">Cash or UPI to the rider</span></span>
          </button>
          {pay === 'cod' && (
            <div className="paybody">
              <p className="small">Keep change ready, or pay the rider by UPI at the door.</p>
            </div>
          )}
        </div>
      </section>

      {isShared && cart.splitMode !== 'host_pays_all' && (
        <section className="merge" style={{ margin: '16px 16px 0', padding: '12px 14px', border: '2px solid var(--clay)', borderRadius: 14, background: 'color-mix(in srgb, var(--clay) 10%, var(--paper))' }}>
          <b>Split: {SPLIT_LABELS[cart.splitMode]}</b>
          <p className="small">Your share is ₹{Math.round(myShare)}. Everyone&rsquo;s payment is collected together when the order is placed.</p>
        </section>
      )}

      {bill && (
        <section className="card bill2" style={{ margin: '16px 16px 0' }}>
          <h3>Bill details</h3>
          <div className="l">
            <span>Item total</span>
            <span>{mrpTotal > bill.subtotal && <s>₹{mrpTotal}</s>} ₹{bill.subtotal}</span>
          </div>
          <div className="l">
            <span>Delivery fee</span>
            <span>{bill.deliveryFee === 0 ? <><s>₹25</s> <b className="saved">Free</b></> : `₹${bill.deliveryFee}`}</span>
          </div>
          {tip > 0 && (
            <div className="l">
              <span>Rider tip</span>
              <span>₹{tip}</span>
            </div>
          )}
          <div className="l tot">
            <span>To pay</span>
            <span>₹{(bill.total + tip)}</span>
          </div>
        </section>
      )}

      <p className="policy">By placing this order you agree to our Terms. Free cancellation until your order is packed.</p>

      {orderError && (
        <p className="small" style={{ margin: '0 16px', color: 'var(--mirchi)', fontWeight: 600 }}>{orderError}</p>
      )}

      <div style={{ height: 16 }} />

      <div className="buybar">
        <div
          ref={sliderRef}
          className="slider"
          role="button"
          tabIndex={0}
          aria-label={pay === 'cod' ? 'Place order' : `Pay ₹${Math.round(due)}`}
          style={{
            position: 'relative', flex: 1, height: 60, border: '2px solid var(--ink)', borderRadius: 16, background: 'var(--haldi)',
            color: 'var(--on-accent)', boxShadow: 'var(--shadow)', overflow: 'hidden', userSelect: 'none',
          }}
        >
          <span
            ref={textRef}
            style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', paddingLeft: 50, fontWeight: 600, fontSize: 16 }}
          >
            {pay === 'cod' ? 'Slide to place order' : `Slide to pay ₹${Math.round(due)}`}
          </span>
          <div
            ref={knobRef}
            className="knob"
            style={{
              position: 'absolute', left: 4, top: 4, bottom: 4, width: 56, borderRadius: 12, background: '#1B1A17', color: '#F6F1E7',
              display: 'grid', placeItems: 'center', cursor: 'grab', touchAction: 'none',
            }}
          >
            <Icon name="arrow" className="h-6 w-6" />
          </div>
        </div>
      </div>

      {showAddress && (
        <AddressSheet
          onClose={() => {
            setShowAddress(false);
            qc.invalidateQueries({ queryKey: ['addresses'] });
          }}
        />
      )}
      {placing && (
        <div className="sheetback" style={{ alignItems: 'center', justifyContent: 'center' }}>
          <p className="font-display" style={{ fontSize: 22, color: '#fff' }}>Placing your order…</p>
        </div>
      )}
    </>
  );
}
