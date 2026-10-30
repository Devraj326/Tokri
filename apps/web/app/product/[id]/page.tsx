'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { clsx } from 'clsx';
import { getProduct, listProducts, type ProductDto } from '../../../lib/api/catalog';
import { listProductReviews, submitReview } from '../../../lib/api/reviews';
import { useSessionStore } from '../../../lib/store/session';
import { useActiveCart } from '../../../lib/hooks/use-active-cart';
import { useWishlist } from '../../../lib/hooks/use-wishlist';
import { QuantityStepper } from '../../../components/ui/quantity-stepper';
import { ProductArt, artKeyFor } from '../../../components/ui/product-art';
import { AppBar } from '../../../components/layout/app-bar';
import { ProductTile } from '../../../components/product/product-tile';
import { AddressSheet } from '../../../components/ui/address-sheet';
import { Icon } from '../../../components/ui/icons';
import {
  CATEGORY_DESC,
  CATEGORY_INFO,
  CATEGORY_NUTRI,
  CATEGORY_TINT,
  FOOD_CATEGORIES,
  hashN,
  unitPrice,
} from '../../../lib/category-meta';

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const storeId = useSessionStore((s) => s.storeId);
  const etaMinutes = useSessionStore((s) => s.etaMinutes);
  const storeName = useSessionStore((s) => s.storeName);
  const router = useRouter();
  const { qtyByVariant, addItem, updateItem, removeItem, cart } = useActiveCart();
  const { isWished, toggle: toggleWish } = useWishlist();
  const tileRef = useRef<HTMLDivElement>(null);
  const galleryRef = useRef<HTMLDivElement>(null);

  const productQuery = useQuery({
    queryKey: ['product', id, storeId],
    queryFn: () => getProduct(id, storeId!),
    enabled: !!storeId,
  });
  const product = productQuery.data;

  const categoryProductsQuery = useQuery({
    queryKey: ['products', storeId, product?.category.slug, product?.subcategory],
    queryFn: () =>
      listProducts(storeId!, product!.category.slug, {
        subcategory: product!.subcategory ?? undefined,
        limit: 20,
      }),
    enabled: !!storeId && !!product,
  });

  const reviewsQuery = useQuery({
    queryKey: ['product-reviews', id],
    queryFn: () => listProductReviews(id),
    enabled: !!id,
  });
  const qc = useQueryClient();
  const submitReviewMutation = useMutation({
    mutationFn: (data: { rating: number; text?: string }) => submitReview(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['product-reviews', id] });
      setMyRating(0);
      setMyReviewText('');
    },
  });

  const [variantIndex, setVariantIndex] = useState(0);
  const [galleryIdx, setGalleryIdx] = useState(0);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [wishPop, setWishPop] = useState(false);
  const [comboSel, setComboSel] = useState<Record<string, boolean>>({});
  const [myRating, setMyRating] = useState(0);
  const [myReviewText, setMyReviewText] = useState('');
  const [addressSheetOpen, setAddressSheetOpen] = useState(false);

  useEffect(() => {
    setVariantIndex(0);
    setGalleryIdx(0);
    setComboSel({});
  }, [id]);

  function onTileMove(e: React.PointerEvent<HTMLDivElement>) {
    const t = tileRef.current;
    if (!t) return;
    const r = t.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    t.style.transform = `perspective(700px) rotateY(${px * 16}deg) rotateX(${-py * 16}deg)`;
  }

  function onGalleryScroll() {
    const g = galleryRef.current;
    if (!g) return;
    setGalleryIdx(Math.round(g.scrollLeft / g.clientWidth));
  }

  function scrollToSlide(i: number) {
    galleryRef.current?.scrollTo({ left: i * (galleryRef.current?.clientWidth ?? 0), behavior: 'smooth' });
  }

  function onToggleWish() {
    if (!product) return;
    toggleWish(product.id);
    setWishPop(true);
    setTimeout(() => setWishPop(false), 400);
  }

  async function share() {
    try {
      await navigator.clipboard.writeText(window.location.href);
    } catch {
      // clipboard unavailable, ignore
    }
  }

  if (!product) {
    return (
      <>
        <AppBar title="" backHref="/" />
        <p className="pad small" style={{ padding: 16, color: 'var(--muted)' }}>Loading…</p>
      </>
    );
  }

  const variant = product.variants[variantIndex] ?? product.variants[0];
  const off = variant.mrp > variant.price ? Math.round((1 - variant.price / variant.mrp) * 100) : 0;
  const perUnit = unitPrice(variant.size, variant.price);
  const slug = product.category.slug;
  const tint = CATEGORY_TINT[slug] ?? product.tileColor;
  const isFood = FOOD_CATEGORIES.has(slug);
  const reviewsData = reviewsQuery.data;
  const count = reviewsData?.count ?? 0;
  const rating = count > 0 ? reviewsData!.average.toFixed(1) : '—';
  const dist = [5, 4, 3, 2, 1].map((star) =>
    count > 0 ? Math.round(((reviewsData!.reviews.filter((r) => r.rating === star).length) / reviewsData!.reviews.length) * 100) : 0,
  );
  const lowStock = variant.qtyAvailable > 0 && variant.qtyAvailable < 15;
  const artKey = artKeyFor(product.name, slug);
  const brand = product.brand ?? 'Tokri';

  const eta = etaMinutes != null ? new Date(Date.now() + etaMinutes * 60000).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }) : null;

  const today = new Date();
  const bestBeforeDays: Record<string, number> = { 'vegetables-fruits': 4, 'grocery-staples': 180 };
  const bestBefore = new Date(today.getTime() + (bestBeforeDays[slug] ?? 365) * 86400000);
  const fmtDate = (d: Date) => d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  const liveTokri = cart && cart.type === 'shared' && cart.status === 'open' ? cart : null;

  const siblings = (categoryProductsQuery.data?.items ?? []).filter((p) => p.id !== product.id);
  const sameSub = siblings.filter((p) => p.subcategory === product.subcategory);
  const comboPool: ProductDto[] = [product, ...sameSub.slice(0, 2)];
  const comboSelected = (pid: string) => comboSel[pid] !== false;
  const chosen = comboPool.filter((p) => comboSelected(p.id));
  const comboTotal = chosen.reduce((sum, p) => sum + (p.variants[0]?.price ?? 0), 0);
  const comboMrp = chosen.reduce((sum, p) => sum + (p.variants[0]?.mrp ?? 0), 0);
  const similar = sameSub.slice(0, 6).length > 0 ? sameSub.slice(0, 6) : siblings.slice(0, 6);

  const reviews = reviewsData?.reviews ?? [];
  const h = hashN(product.id);

  async function addCombo() {
    for (const p of chosen) {
      const v = p.variants[0];
      if (v) await addItem.mutateAsync({ variantId: v.id, qty: 1 });
    }
  }

  function shortName(name: string) {
    return name.split(' (')[0].split(',')[0];
  }

  function starGlyphs(r: number) {
    const n = Math.round(r);
    return '★★★★★'.slice(0, n) + '☆☆☆☆☆'.slice(0, 5 - n);
  }

  return (
    <>
      <AppBar
        className="pbar"
        title=""
        backHref={`/category/${slug}`}
        right={
          <>
            <button className={clsx('iconbtn heart', isWished(product.id) && 'on', wishPop && 'pop')} aria-pressed={isWished(product.id)} aria-label="Save to wishlist" onClick={onToggleWish}>
              <Icon name="heart" />
            </button>
            <button className="iconbtn" aria-label="Share" onClick={share}>
              <Icon name="share" />
            </button>
          </>
        }
      />

      <section className="gallery-wrap">
        <div className="gallery" ref={galleryRef} onScroll={onGalleryScroll} aria-label="Product images">
          <div
            ref={tileRef}
            onPointerMove={onTileMove}
            onPointerLeave={() => { if (tileRef.current) tileRef.current.style.transform = ''; }}
            className={clsx('gslide', `t-${product.tileColor}`)}
            id="tilt"
            onClick={() => setZoomOpen(true)}
          >
            <ProductArt artKey={artKey} tint={product.tileColor} />
          </div>
          <div className={clsx('gslide closeup', `t-${product.tileColor}`)} onClick={() => setZoomOpen(true)}>
            <ProductArt artKey={artKey} tint={product.tileColor} />
          </div>
          <div className="gslide t-dust label-slide">
            <div className="packlabel">
              {isFood && product.isVeg && <span className="vegmark" title="Vegetarian" />}
              <div className="lb-brand">{brand}</div>
              <b>{product.name}</b>
              <dl>
                <dt>Net qty</dt>
                <dd>{variant.size}</dd>
                <dt>MRP</dt>
                <dd>₹{variant.mrp} incl. of all taxes</dd>
                {isFood ? (
                  <>
                    <dt>Packed on</dt>
                    <dd>{fmtDate(today)}</dd>
                    <dt>Best before</dt>
                    <dd>{fmtDate(bestBefore)}</dd>
                  </>
                ) : (
                  <>
                    <dt>Model</dt>
                    <dd>FX-{(h % 900) + 100}</dd>
                    <dt>Warranty</dt>
                    <dd>6 months</dd>
                  </>
                )}
              </dl>
              <div className="barcode" aria-hidden />
              <span className="lb-fine">Customer care: help@tokri.app</span>
            </div>
          </div>
        </div>
        <span className="gcount">{galleryIdx + 1}/3</span>
        <div className="gdots">
          {[0, 1, 2].map((i) => (
            <button key={i} className={clsx(i === galleryIdx && 'on')} aria-label={`Image ${i + 1}`} onClick={() => scrollToSlide(i)} />
          ))}
        </div>
      </section>

      <div className="pinfo">
        <Link href={`/category/${slug}?sub=${encodeURIComponent(product.subcategory ?? '')}`} className="crumb">
          {product.category.name} / {product.subcategory ?? 'All'}
        </Link>
        <p className="brand">
          {isFood && product.isVeg && <span className="vegmark" title="Vegetarian" />}
          {brand}
        </p>
        <h1 className="pname">{product.name}</h1>
        <div className="rating-row">
          <span className="stars">★ {rating}</span>
          <button className="link small" onClick={() => document.getElementById('reviews')?.scrollIntoView({ behavior: 'smooth' })}>
            {count.toLocaleString('en-IN')} ratings
          </button>
        </div>
        <div className="price-block">
          <span className="pbig">₹{variant.price}</span>
          {off > 0 && (
            <>
              <s>MRP ₹{variant.mrp}</s>
              <span className="offbadge">{off}% OFF</span>
            </>
          )}
        </div>
        <p className="tax">
          {off === 0 && `MRP ₹${variant.mrp}, `}Inclusive of all taxes{perUnit ? `. ${perUnit}` : ''}
        </p>
        {lowStock && <p className="lowstock">Only {variant.qtyAvailable} left at your store</p>}
      </div>

      <section className="pblock">
        <h3>Pick a pack size</h3>
        <div className="variants">
          {product.variants.map((v, i) => {
            const o = v.mrp > v.price ? Math.round((1 - v.price / v.mrp) * 100) : 0;
            const u = unitPrice(v.size, v.price);
            const inCartQty = qtyByVariant[v.id]?.qty;
            return (
              <button key={v.id} className="vcard" aria-pressed={i === variantIndex} onClick={() => setVariantIndex(i)}>
                {o > 0 && <span className="voff">{o}% off</span>}
                <b>{v.size}</b>
                <span className="vprice">
                  ₹{v.price}
                  {o > 0 && <s> ₹{v.mrp}</s>}
                </span>
                {u && <span className="vunit">{u}</span>}
                {inCartQty ? <span className="vin">{inCartQty} in cart</span> : null}
              </button>
            );
          })}
        </div>
        {liveTokri && (
          <button className="link small" style={{ marginTop: 12 }} onClick={() => router.push(`/tokri/${liveTokri.id}`)}>
            Add to {liveTokri.name ?? 'the shared Tokri'} instead
          </button>
        )}
      </section>

      {eta && (
        <section className="pblock deliv">
          <span className="dicon"><Icon name="clock" /></span>
          <div>
            <b>Arrives by {eta}</b>
            <p className="small muted">To {storeName}</p>
          </div>
          <button className="link small" onClick={() => setAddressSheetOpen(true)}>Change</button>
        </section>
      )}
      <div className="trust">
        <div><Icon name="bolt" />{etaMinutes ?? 10}-minute delivery</div>
        <div><Icon name="shield" />{isFood ? 'Fresh or your money back' : '7-day replacement'}</div>
        <div><Icon name="cash" />Cash on delivery</div>
      </div>

      {sameSub.length > 0 && (
        <section className="pblock combo">
          <h3>Often bought together</h3>
          <div className="combo-row">
            {comboPool.map((p, i) => {
              const v = p.variants[0];
              const selected = comboSelected(p.id);
              return (
                <div key={p.id} style={{ display: 'contents' }}>
                  {i > 0 && <span className="cplus" aria-hidden>+</span>}
                  <div className={clsx('ctile', !selected && 'off')}>
                    <button
                      className="check"
                      aria-pressed={selected}
                      aria-label={`Include ${p.name}`}
                      onClick={() => setComboSel((s) => ({ ...s, [p.id]: !selected }))}
                      disabled={i === 0}
                    />
                    <Link href={`/product/${p.id}`} className={clsx('ptile', `t-${p.tileColor}`)}>
                      <ProductArt artKey={artKeyFor(p.name, p.category.slug)} tint={p.tileColor} />
                    </Link>
                    <span>{i === 0 ? 'This item' : shortName(p.name)}</span>
                    <span className="price" style={{ fontSize: 12.5 }}>₹{v?.price ?? 0}</span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="combo-foot">
            <span className="small">
              Total <b className="mono" style={{ fontSize: 16 }}>₹{comboTotal}</b>
              {comboMrp > comboTotal && <s className="mono muted"> ₹{comboMrp}</s>}
            </span>
            <button className="btn primary" disabled={chosen.length === 0} onClick={addCombo}>
              Add {chosen.length} item{chosen.length === 1 ? '' : 's'}
            </button>
          </div>
        </section>
      )}

      <section className="pblock acc">
        <details open>
          <summary>Description</summary>
          <p>{CATEGORY_DESC[slug] ?? 'Quality checked before it reaches you.'}</p>
        </details>
        <details>
          <summary>Key information</summary>
          <table className="kv">
            <tbody>
              {[...(CATEGORY_INFO[slug] ?? []), ['Brand', brand], ['Net quantity', variant.size]].map(([k, v]) => (
                <tr key={k}>
                  <td>{k}</td>
                  <td>{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
        {CATEGORY_NUTRI[slug] && (
          <details>
            <summary>Nutrition per 100 g</summary>
            <table className="kv">
              <tbody>
                {CATEGORY_NUTRI[slug]!.map(([k, v]) => (
                  <tr key={k}>
                    <td>{k}</td>
                    <td className="mono">{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="disclaimer">Sample values for this prototype.</p>
          </details>
        )}
        <details>
          <summary>Returns and refunds</summary>
          <p>
            {isFood
              ? 'Not happy with freshness or quality? Report it from your order within 48 hours and we refund it, no questions asked.'
              : 'Damaged or not working? Request a replacement within 7 days from your order page. Keep the box and accessories.'}
          </p>
        </details>
        <details>
          <summary>Seller and manufacturer</summary>
          <p>
            Sold by Tokri Retail Pvt. Ltd.
            <br />
            {isFood && (
              <>
                FSSAI licence no. 1001902200XXXX (sample)
                <br />
              </>
            )}
            Customer care: help@tokri.app
          </p>
        </details>
        <p className="disclaimer">Images are illustrations. Check the pack for exact details before use.</p>
      </section>

      <section className="pblock" id="reviews">
        <h3>Ratings and reviews</h3>
        <div className="rsum">
          <div className="rbig">
            <b>{rating}</b>
            <span className="st" aria-hidden>{starGlyphs(parseFloat(rating))}</span>
            <small>{count.toLocaleString('en-IN')} ratings</small>
          </div>
          <div className="rbars">
            {[5, 4, 3, 2, 1].map((star, i) => (
              <div key={star}>
                <span>{star}</span>
                <i><b style={{ width: `${dist[i]}%` }} /></i>
                <span>{dist[i]}%</span>
              </div>
            ))}
          </div>
        </div>
        <div className="review" style={{ marginBottom: 16 }}>
          <b style={{ display: 'block', marginBottom: 6 }}>Rate this product</b>
          <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => setMyRating(n)}
                aria-label={`${n} star`}
                style={{ fontSize: 22, background: 'none', border: 'none', cursor: 'pointer', color: n <= myRating ? 'var(--haldi)' : 'var(--dust)' }}
              >
                ★
              </button>
            ))}
          </div>
          {myRating > 0 && (
            <>
              <textarea
                className="admin-input"
                placeholder="Say something about it (optional)"
                value={myReviewText}
                onChange={(e) => setMyReviewText(e.target.value)}
                rows={2}
                style={{ width: '100%', resize: 'vertical' }}
              />
              <button
                className="btn primary"
                style={{ marginTop: 8 }}
                disabled={submitReviewMutation.isPending}
                onClick={() => submitReviewMutation.mutate({ rating: myRating, text: myReviewText || undefined })}
              >
                {submitReviewMutation.isPending ? 'Submitting…' : 'Submit review'}
              </button>
            </>
          )}
        </div>
        {reviews.length === 0 ? (
          <p className="muted small">No reviews yet — be the first to rate this.</p>
        ) : (
          reviews.map((r, i) => (
            <article className="review" key={r.id}>
              <header>
                <span className="av" style={{ width: 28, height: 28, fontSize: 12, borderRadius: '50%', border: '2px solid var(--ink)', display: 'grid', placeItems: 'center', background: ['var(--methi)', 'var(--clay)', 'var(--mirchi)'][i % 3], color: 'var(--on-accent)' }}>
                  {r.userName[0]}
                </span>
                <b>{r.userName}</b>
                <span className="rs">★ {r.rating}</span>
                <span className="muted small" style={{ marginLeft: 'auto' }}>{new Date(r.createdAt).toLocaleDateString('en-IN')}</span>
              </header>
              {r.text && <p>{r.text}</p>}
            </article>
          ))
        )}
      </section>

      {similar.length > 0 && (
        <>
          <h2 className="sec" style={{ margin: '26px 16px 12px' }}>Similar products</h2>
          <div className="hscroll" style={{ padding: '0 16px 6px' }}>
            {similar.map((p) => (
              <ProductTile key={p.id} product={p} />
            ))}
          </div>
        </>
      )}
      <div style={{ height: 16 }} />

      <div className="buybar pbuy">
        <div>
          <span className="small muted">{variant.size}</span>
          <div className="price" style={{ fontSize: 18 }}>
            ₹{variant.price}
            {off > 0 && <s> ₹{variant.mrp}</s>}
          </div>
        </div>
        {(() => {
          const entry = qtyByVariant[variant.id];
          const qty = entry?.qty ?? 0;
          return qty > 0 ? (
            <QuantityStepper
              qty={qty}
              large
              disabled={variant.qtyAvailable <= 0}
              onAdd={() => addItem.mutate({ variantId: variant.id, qty: 1 })}
              onIncrement={() => (entry ? updateItem.mutate({ itemId: entry.itemId, qty: qty + 1 }) : addItem.mutate({ variantId: variant.id, qty: 1 }))}
              onDecrement={() => entry && (qty <= 1 ? removeItem.mutate(entry.itemId) : updateItem.mutate({ itemId: entry.itemId, qty: qty - 1 }))}
            />
          ) : (
            <button className="btn primary" disabled={variant.qtyAvailable <= 0} onClick={() => addItem.mutate({ variantId: variant.id, qty: 1 })}>
              Add to cart
            </button>
          );
        })()}
      </div>

      {zoomOpen && (
        <ZoomOverlay artKey={artKey} tint={product.tileColor} onClose={() => setZoomOpen(false)} />
      )}
      {addressSheetOpen && <AddressSheet onClose={() => setAddressSheetOpen(false)} />}
    </>
  );
}

function ZoomOverlay({ artKey, tint, onClose }: { artKey: ReturnType<typeof artKeyFor>; tint: string; onClose: () => void }) {
  const [zoomed, setZoomed] = useState(false);
  const tileRef = useRef<HTMLDivElement>(null);

  function onMove(e: React.PointerEvent<HTMLDivElement>) {
    const t = tileRef.current;
    if (!t) return;
    const r = t.getBoundingClientRect();
    const svg = t.querySelector('svg') as SVGElement | null;
    if (svg) svg.style.transformOrigin = `${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`;
  }

  return (
    <div className="zoom">
      <button className="iconbtn zclose" aria-label="Close" onClick={onClose}>
        <Icon name="x" />
      </button>
      <div
        ref={tileRef}
        className={clsx('ztile', `t-${tint}`, zoomed && 'z')}
        onClick={() => setZoomed((z) => !z)}
        onPointerMove={onMove}
      >
        <ProductArt artKey={artKey} tint={tint} />
      </div>
      <p className="small muted">Tap the picture to zoom, move to look around</p>
    </div>
  );
}
