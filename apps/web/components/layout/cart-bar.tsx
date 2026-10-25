'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useActiveCart } from '../../lib/hooks/use-active-cart';
import { artKeyFor, ProductArt } from '../ui/product-art';

const CARTBAR_PREFIXES = ['/category', '/search'];

export function CartBar() {
  const pathname = usePathname();
  const { cart, bill } = useActiveCart();
  // The kit result page (/kit/result) has its own dedicated buy bar, so it's
  // deliberately excluded here — showing both would overlap at the bottom.
  const eligible = pathname === '/' || pathname === '/kit' || CARTBAR_PREFIXES.some((p) => pathname.startsWith(p));
  const items = cart?.items ?? [];
  const n = items.length;
  const show = eligible && n > 0;

  const [entering, setEntering] = useState(false);
  const [bumping, setBumping] = useState(false);
  const wasShown = useRef(false);
  const prevCount = useRef(n);

  useEffect(() => {
    if (show && !wasShown.current) {
      setEntering(true);
      const t = setTimeout(() => setEntering(false), 400);
      wasShown.current = true;
      return () => clearTimeout(t);
    }
    if (!show) wasShown.current = false;
  }, [show]);

  useEffect(() => {
    if (show && prevCount.current !== n && prevCount.current !== 0) {
      setBumping(true);
      const t = setTimeout(() => setBumping(false), 400);
      prevCount.current = n;
      return () => clearTimeout(t);
    }
    prevCount.current = n;
  }, [n, show]);

  if (!show || !cart) return null;

  const thumbs = items.slice(-3).reverse();
  const freeDelivery = bill && bill.subtotal >= bill.freeDeliveryThreshold;

  return (
    <Link
      href={`/cart?cartId=${cart.id}`}
      className={`cartbar on${entering ? ' enter' : ''}${bumping ? ' bump' : ''}`}
      aria-label="View cart"
    >
      <span className="thumbs">
        {thumbs.map((it) => (
          <span key={it.id} className="ptile t-dust" style={{ width: 34, height: 34, padding: 4, borderRadius: 8 }}>
            <ProductArt artKey={artKeyFor(it.name)} />
          </span>
        ))}
      </span>
      <span className="info">
        {n} item{n > 1 ? 's' : ''}
        {freeDelivery ? (
          <>
            , <em>free delivery</em>
          </>
        ) : null}
        <br />
        <b className="mono">₹{bill?.total ?? 0}</b>
      </span>
      <span className="go">View cart</span>
    </Link>
  );
}
