'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getOrder, reorder, type OrderDetailDto } from '../../../lib/api/orders';
import { getCart } from '../../../lib/api/cart';
import { getSocket } from '../../../lib/socket';
import { useSessionStore } from '../../../lib/store/session';
import { AppBar } from '../../../components/layout/app-bar';
import { AlooMascot3D } from '../../../components/three/aloo-mascot-3d';
import { Icon } from '../../../components/ui/icons';
import { ProductArt, artKeyFor } from '../../../components/ui/product-art';

type OrderStatus = 'confirmed' | 'packing' | 'out_for_delivery' | 'delivered';
const STAGES: Array<{ key: OrderStatus; label: string; detail: string; icon: 'check' | 'box' | 'scooter' | 'home' }> = [
  { key: 'confirmed', label: 'Confirmed', detail: 'We’ve got your order', icon: 'check' },
  { key: 'packing', label: 'Packing', detail: 'Your items are being packed', icon: 'box' },
  { key: 'out_for_delivery', label: 'On the way', detail: 'Your rider is heading over', icon: 'scooter' },
  { key: 'delivered', label: 'Delivered', detail: 'Enjoy!', icon: 'home' },
];
const PROGRESS: Record<OrderStatus, number> = { confirmed: 0, packing: 0.15, out_for_delivery: 0.6, delivered: 1 };
const ROUTE_D = 'M40 200 H120 V120 H220 V60 H300';
const RING_R = 52;
const RING_C = 2 * Math.PI * RING_R;

export default function OrderTrackingPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const setActiveCart = useSessionStore((s) => s.setActiveCart);
  const orderQuery = useQuery({ queryKey: ['order', id], queryFn: () => getOrder(id) });
  const [status, setStatus] = useState<OrderStatus | null>(null);
  const [eta, setEta] = useState<string | null>(null);
  const [rating, setRating] = useState(0);
  const [itemRating, setItemRating] = useState<Record<string, 1 | 0 | undefined>>({});
  const [reordering, setReordering] = useState(false);
  const pathRef = useRef<SVGPathElement>(null);
  const riderRef = useRef<SVGGElement>(null);
  const doneRef = useRef<SVGPathElement>(null);

  useEffect(() => {
    if (orderQuery.data) {
      setStatus(orderQuery.data.status);
      setEta(orderQuery.data.eta);
    }
  }, [orderQuery.data]);

  useEffect(() => {
    if (!orderQuery.data) return;
    const socket = getSocket();
    socket.emit('cart:join', { cartId: orderQuery.data.cartId });
    function onStatus(payload: { orderId: string; status: OrderStatus; eta: string | null }) {
      if (payload.orderId === id) {
        setStatus(payload.status);
        setEta(payload.eta);
      }
    }
    socket.on('order:status', onStatus);
    return () => {
      socket.off('order:status', onStatus);
    };
  }, [orderQuery.data, id]);

  useEffect(() => {
    if (!status || !pathRef.current || !riderRef.current) return;
    const len = pathRef.current.getTotalLength();
    const f = PROGRESS[status];
    const pt = pathRef.current.getPointAtLength(f * len);
    riderRef.current.setAttribute('transform', `translate(${pt.x} ${pt.y})`);
    if (doneRef.current) {
      doneRef.current.style.strokeDasharray = String(len);
      doneRef.current.style.strokeDashoffset = String(len * (1 - f));
    }
  }, [status]);

  const order = orderQuery.data as OrderDetailDto | undefined;
  const cartQuery = useQuery({ queryKey: ['order-cart', order?.cartId], queryFn: () => getCart(order!.cartId), enabled: !!order });
  const items = cartQuery.data?.items ?? [];

  const currentStepIndex = status ? STAGES.findIndex((s) => s.key === status) : -1;
  const packedAll = status !== 'confirmed';

  async function handleReorder() {
    if (!order) return;
    setReordering(true);
    try {
      const cart = await reorder(order.id, order.storeId);
      setActiveCart(cart.id);
      router.push('/cart');
    } finally {
      setReordering(false);
    }
  }

  if (!order || !status) {
    return (
      <>
        <AppBar title="Order" backHref="/" />
        <p className="pad small" style={{ padding: 16, color: 'var(--muted)' }}>Loading…</p>
      </>
    );
  }

  if (status === 'delivered') {
    return (
      <>
        <AppBar title={`Order ${order.id.slice(0, 6).toUpperCase()}`} backHref="/" />
        <section className="dl-hero">
          <span className="stamp green" style={{ fontSize: 28 }}>DELIVERED</span>
          <h2>Enjoy your order</h2>
          <p className="small muted">{items.length} item{items.length !== 1 ? 's' : ''}, paid ₹{order.total}</p>
          <div style={{ width: 110, height: 110 }}>
            <AlooMascot3D state="jump" look={0.5} className="h-full w-full" />
          </div>
        </section>

        <section className="card pblock rate">
          <b>How was {order.riderName?.split(' ')[0] ?? 'your rider'}?</b>
          <div className="starsel">
            {[1, 2, 3, 4, 5].map((i) => (
              <button key={i} aria-label={`${i} star${i > 1 ? 's' : ''}`} aria-pressed={rating >= i} onClick={() => setRating(i)}>★</button>
            ))}
          </div>
          <p className="small muted">{['Tap a star', 'Sorry about that', 'Not great', 'Okay', 'Good', 'Loved it'][rating]}</p>
        </section>

        {items.length > 0 && (
          <section className="card pblock" style={{ padding: '12px 14px' }}>
            <b>Rate your items</b>
            {items.map((item) => (
              <div key={item.id} className="irow">
                <div className="ptile t-dust">
                  <ProductArt artKey={artKeyFor(item.name)} />
                </div>
                <span className="small"><b>{item.name}</b></span>
                <span className="thumbs">
                  <button aria-label="Good" aria-pressed={itemRating[item.id] === 1} onClick={() => setItemRating((r) => ({ ...r, [item.id]: r[item.id] === 1 ? undefined : 1 }))}>
                    <Icon name="up" className="h-4 w-4" />
                  </button>
                  <button aria-label="Not good" aria-pressed={itemRating[item.id] === 0} onClick={() => setItemRating((r) => ({ ...r, [item.id]: r[item.id] === 0 ? undefined : 0 }))}>
                    <Icon name="down" className="h-4 w-4" />
                  </button>
                </span>
              </div>
            ))}
          </section>
        )}

        <div className="pad stack" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button className="btn primary block" disabled={reordering} onClick={handleReorder}>
            {reordering ? 'Adding to cart…' : 'Order these again'}
          </button>
          <button className="btn ghost block" onClick={() => router.push('/')}>Back to home</button>
        </div>
      </>
    );
  }

  const f = PROGRESS[status];
  const minsLeft = eta ? Math.max(0, Math.round((new Date(eta).getTime() - Date.now()) / 60000)) : 12;

  return (
    <>
      <AppBar title={`Order ${order.id.slice(0, 6).toUpperCase()}`} backHref="/" />

      <section className="trk-hero">
        <div className="ring">
          <svg viewBox="0 0 120 120" aria-hidden>
            <circle cx="60" cy="60" r={RING_R} className="rtrack" />
            <circle cx="60" cy="60" r={RING_R} className="rfill" pathLength={100} strokeDasharray={100} strokeDashoffset={100 - f * 100} />
          </svg>
          <div className="ring-in">
            <b>{minsLeft}</b>
            <small>min</small>
          </div>
        </div>
        <div className="trk-t">
          <p className="small muted">{STAGES[currentStepIndex]?.label}</p>
          <h2>{STAGES[currentStepIndex]?.detail}</h2>
        </div>
      </section>

      <ol className="stagebar" style={{ '--p': currentStepIndex / (STAGES.length - 1) } as CSSProperties}>
        {STAGES.map((s, i) => (
          <li key={s.key} className={i < currentStepIndex ? 'done' : i === currentStepIndex ? 'now' : ''}>
            <span><Icon name={s.icon} className="h-[18px] w-[18px]" /></span>
            <small>{s.label}</small>
          </li>
        ))}
      </ol>

      <div className="mapbox trkmap" style={{ margin: '14px 16px 0', border: '2px solid var(--ink)', borderRadius: 18, overflow: 'hidden' }}>
        <svg viewBox="0 0 340 240" aria-label="Map showing the rider's route" role="img">
          <rect width="340" height="240" fill="var(--dust)" />
          <g stroke="var(--paper)" strokeWidth={14}>
            <path d="M0 200h340M0 120h340M0 60h340M40 0v240M120 0v240M220 0v240M300 0v240" />
          </g>
          <rect x="140" y="135" width="64" height="50" rx="6" fill="#C5D8BE" />
          <path ref={pathRef} d={ROUTE_D} fill="none" stroke="var(--ink)" strokeWidth={4} strokeDasharray="2 8" strokeLinecap="round" />
          <path ref={doneRef} d={ROUTE_D} fill="none" stroke="var(--methi)" strokeWidth={5} strokeLinecap="round" strokeDasharray={1000} strokeDashoffset={1000} style={{ transition: 'stroke-dashoffset .5s linear' }} />
          <circle cx="300" cy="60" r="9" fill="var(--mirchi)" />
          <g transform="translate(40 200)">
            <rect x="-16" y="-16" width="32" height="32" rx="6" fill="var(--haldi)" stroke="#1B1A17" strokeWidth={2.5} />
            <text y="5" fontSize="12" textAnchor="middle" fontWeight={700} fill="#1B1A17">T</text>
          </g>
          <g transform="translate(300 60)">
            <path d="M0 14s-14-12-14-24a14 14 0 0128 0c0 12-14 24-14 24z" transform="translate(0 -14)" fill="var(--mirchi)" stroke="#1B1A17" strokeWidth={2.5} />
            <circle cy="-24" r="5" fill="#fff" />
          </g>
          <g ref={riderRef}>
            <circle r="13" fill="var(--methi)" stroke="#1B1A17" strokeWidth={2.5} />
            <path d="M-6 3h12M-4 3l2-7h5" stroke="#fff" strokeWidth={2.2} fill="none" strokeLinecap="round" />
          </g>
        </svg>
        <span className="dist">{currentStepIndex < 2 ? 'Rider waiting at the store' : 'On the way'}</span>
      </div>

      <section className="card pblock rider" style={{ margin: '14px 16px 0' }}>
        <span className="av" style={{ width: 46, height: 46, fontSize: 18, borderRadius: '50%', border: '2px solid var(--ink)', background: '#8DBB8F', display: 'grid', placeItems: 'center', fontWeight: 600 }}>
          {(order.riderName ?? 'S')[0]}
        </span>
        <div style={{ flex: 1 }}>
          <b>{order.riderName ?? 'Your rider'}</b>
          <p className="small muted">On a scooter</p>
        </div>
        <button className="iconbtn" aria-label="Call rider">
          <Icon name="phone" />
        </button>
      </section>

      {items.length > 0 && (
        <section className="card pblock titems" style={{ margin: '14px 16px 0' }}>
          <header>
            <b>Your items</b>
            <span className="small muted">{packedAll ? 'All packed' : `0 of ${items.length} packed`}</span>
          </header>
          {items.map((item) => (
            <div key={item.id} className={`tit ${packedAll ? 'done' : ''}`}>
              <div className="ptile t-dust">
                <ProductArt artKey={artKeyFor(item.name)} />
              </div>
              <span>{item.name}</span>
              <span className="small tabular-price">× {item.qty}</span>
              <span className="tick"><Icon name="check" className="h-3 w-3" /></span>
            </div>
          ))}
        </section>
      )}

      <p className="small pad" style={{ padding: 16, color: 'var(--muted)' }}>Paid ₹{order.total}</p>
    </>
  );
}
