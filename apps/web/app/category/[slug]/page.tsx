'use client';

import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Fragment, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { listCategories, listProducts, type ProductDto } from '../../../lib/api/catalog';
import { useSessionStore } from '../../../lib/store/session';
import { ProductTile } from '../../../components/product/product-tile';
import { AppBar } from '../../../components/layout/app-bar';
import { Icon } from '../../../components/ui/icons';
import { ProductArt, artKeyFor } from '../../../components/ui/product-art';
import { CATEGORY_NOTE, CATEGORY_SUBCATS, CATEGORY_TINT, CATEGORY_XSELL, cheapCapFor } from '../../../lib/category-meta';

type SortMode = 'rel' | 'low' | 'high' | 'off';
const SORT_LABEL: Record<SortMode, string> = { rel: 'Sort', low: 'Lowest price', high: 'Highest price', off: 'Best discount' };
const SORT_OPTIONS: { key: SortMode; label: string }[] = [
  { key: 'rel', label: 'Relevance' },
  { key: 'low', label: 'Lowest price first' },
  { key: 'high', label: 'Highest price first' },
  { key: 'off', label: 'Best discount first' },
];

function discount(p: ProductDto): number {
  const v = p.variants[0];
  if (!v || v.mrp <= 0) return 0;
  return 1 - v.price / v.mrp;
}

export default function CategoryPage() {
  const { slug } = useParams<{ slug: string }>();
  const storeId = useSessionStore((s) => s.storeId);
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialSub = searchParams.get('sub') ?? '';

  const [subTab, setSubTab] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('rel');
  const [offerOnly, setOfferOnly] = useState(false);
  const [cheapOnly, setCheapOnly] = useState(false);
  const [sortSheetOpen, setSortSheetOpen] = useState(false);

  const gridRef = useRef<HTMLDivElement>(null);
  const flipSnapshot = useRef<Map<string, DOMRect> | null>(null);
  const pillsRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLElement>(null);
  const indRef = useRef<HTMLDivElement>(null);
  const prevIndY = useRef<number | null>(null);

  const categoriesQuery = useQuery({ queryKey: ['categories'], queryFn: listCategories });
  const productsQuery = useQuery({
    queryKey: ['products', storeId, slug],
    queryFn: () => listProducts(storeId!, slug),
    enabled: !!storeId,
  });

  const category = categoriesQuery.data?.find((c) => c.slug === slug);
  const tint = CATEGORY_TINT[slug] ?? 'dust';
  const all = productsQuery.data ?? [];
  const cap = cheapCapFor(slug);

  const inSub = (sub: string) => (sub === '' ? all : all.filter((p) => p.subcategory === sub));
  const subcats = (CATEGORY_SUBCATS[slug] ?? []).filter((sub) => inSub(sub).length > 0);

  let list = inSub(subTab);
  if (offerOnly) list = list.filter((p) => { const v = p.variants[0]; return v && v.mrp > v.price; });
  if (cheapOnly) list = list.filter((p) => { const v = p.variants[0]; return v && v.price < cap; });
  if (sortMode === 'low') list = [...list].sort((a, b) => (a.variants[0]?.price ?? 0) - (b.variants[0]?.price ?? 0));
  if (sortMode === 'high') list = [...list].sort((a, b) => (b.variants[0]?.price ?? 0) - (a.variants[0]?.price ?? 0));
  if (sortMode === 'off') list = [...list].sort((a, b) => discount(b) - discount(a));

  const xsell = CATEGORY_XSELL[slug];
  const showXsell = xsell && subTab === '' && !offerOnly && !cheapOnly && list.length > 0;
  const xsellAt = Math.min(4, list.length);

  // Auto-scroll the active category pill into view when switching categories.
  useEffect(() => {
    const pills = pillsRef.current;
    const active = pills?.querySelector<HTMLElement>('[aria-current="true"]');
    if (pills && active) {
      pills.scrollLeft = active.offsetLeft - pills.clientWidth / 2 + active.offsetWidth / 2;
    }
  }, [slug]);

  // Reset subcategory/filters when switching to a different category, unless
  // a ?sub= query param (from a product page breadcrumb) requests one.
  useEffect(() => {
    setSubTab(initialSub);
    setOfferOnly(false);
    setCheapOnly(false);
    setSortMode('rel');
    prevIndY.current = null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  // Slide the rail's active-tab indicator to the current subcategory button.
  useLayoutEffect(() => {
    const rail = railRef.current;
    const ind = indRef.current;
    if (!rail || !ind) return;
    const active = rail.querySelector<HTMLElement>('[aria-current="true"]');
    if (!active) return;
    const y = active.offsetTop;
    const h = active.offsetHeight;
    const prev = prevIndY.current ?? y;
    ind.style.transition = 'none';
    ind.style.height = `${h}px`;
    ind.style.transform = `translateY(${prev}px)`;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        ind.style.transition = '';
        ind.style.transform = `translateY(${y}px)`;
      });
    });
    prevIndY.current = y;
  }, [subTab, subcats.length]);

  // FLIP: snapshot current tile positions before a filter/sort change, then
  // animate the delta once the new layout has painted.
  function captureFlip() {
    const grid = gridRef.current;
    if (!grid) return;
    const map = new Map<string, DOMRect>();
    grid.querySelectorAll<HTMLElement>('[data-pid]').forEach((el) => map.set(el.dataset.pid!, el.getBoundingClientRect()));
    flipSnapshot.current = map;
  }

  useLayoutEffect(() => {
    const prev = flipSnapshot.current;
    const grid = gridRef.current;
    if (!prev || !grid) return;
    flipSnapshot.current = null;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    grid.querySelectorAll<HTMLElement>('[data-pid]').forEach((el, i) => {
      const rect = el.getBoundingClientRect();
      const old = prev.get(el.dataset.pid!);
      if (old) {
        const dx = old.left - rect.left;
        const dy = old.top - rect.top;
        if (dx || dy) el.animate([{ transform: `translate(${dx}px,${dy}px)` }, { transform: 'none' }], { duration: 420, easing: 'cubic-bezier(.2,.8,.2,1)' });
      } else {
        el.animate([{ opacity: 0, transform: 'scale(.9)' }, { opacity: 1, transform: 'none' }], { duration: 320, delay: i * 30, easing: 'ease-out', fill: 'backwards' });
      }
    });
  }, [list.map((p) => p.id).join(',')]);

  function scrollListIntoView() {
    const grid = gridRef.current;
    if (!grid) return;
    const target = grid.getBoundingClientRect().top + window.scrollY - 180;
    if (window.scrollY > target) window.scrollTo({ top: target, behavior: 'auto' });
  }

  function toggleSub(sub: string) {
    if (sub === subTab) return;
    captureFlip();
    scrollListIntoView();
    setSubTab(sub);
  }
  function toggleOffer() {
    captureFlip();
    scrollListIntoView();
    setOfferOnly((v) => !v);
  }
  function toggleCheap() {
    captureFlip();
    scrollListIntoView();
    setCheapOnly((v) => !v);
  }
  function applySort(mode: SortMode) {
    captureFlip();
    setSortMode(mode);
    setSortSheetOpen(false);
  }
  function clearFilters() {
    captureFlip();
    setOfferOnly(false);
    setCheapOnly(false);
    setSortMode('rel');
    setSubTab('');
  }

  return (
    <>
      <AppBar
        fade
        title={category?.name ?? slug?.replace(/-/g, ' ')}
        backHref="/"
        right={
          <a href="/search" className="iconbtn" aria-label="Search">
            <Icon name="search" />
          </a>
        }
      />

      {category && (
        <section className={`cathero t-${tint}`}>
          <div className="ch-text">
            {category.hindiName && <span className="deva font-devanagari">{category.hindiName}</span>}
            <h2>{category.name}</h2>
            <p>
              {all.length} item{all.length === 1 ? '' : 's'}. {CATEGORY_NOTE[slug] ?? 'Fresh stock, fast delivery'}.
            </p>
          </div>
          <div className="ch-art">
            <ProductArt artKey={artKeyFor(category.name, category.slug)} tint={tint} />
          </div>
        </section>
      )}

      <nav className="catpills" aria-label="Categories" ref={pillsRef}>
        {categoriesQuery.data?.map((c) => (
          <Link key={c.id} href={`/category/${c.slug}`} className="chip" aria-current={c.slug === slug}>
            {c.name}
          </Link>
        ))}
      </nav>

      <div className="catlayout">
        {storeId && subcats.length > 0 && (
          <nav className="rail" aria-label="Subcategories" ref={railRef}>
            <span className="rail-ind" ref={indRef} aria-hidden />
            <button aria-current={subTab === ''} onClick={() => toggleSub('')}>
              {category && <ProductArt artKey={artKeyFor(category.name, category.slug)} tint={tint} />}
              <span>All</span>
              <small>{all.length}</small>
            </button>
            {subcats.map((sub) => {
              const first = inSub(sub)[0];
              return (
                <button key={sub} aria-current={subTab === sub} onClick={() => toggleSub(sub)}>
                  <ProductArt artKey={artKeyFor(first.name, first.category.slug)} tint={first.tileColor} />
                  <span>{sub}</span>
                  <small>{inSub(sub).length}</small>
                </button>
              );
            })}
          </nav>
        )}
        <div className="catmain">
        {!storeId ? (
          <p className="small pad" style={{ padding: 16, color: 'var(--muted)' }}>
            <Link href="/" style={{ color: 'var(--mirchi)', textDecoration: 'underline' }}>Set your delivery location</Link> to see items here.
          </p>
        ) : (
          <>
            <div className="filters">
              <button className="chip" aria-pressed={sortMode !== 'rel'} onClick={() => setSortSheetOpen(true)}>
                {SORT_LABEL[sortMode]} <Icon name="chevron-down" />
              </button>
              <button className="chip" aria-pressed={offerOnly} onClick={toggleOffer}>On offer</button>
              <button className="chip" aria-pressed={cheapOnly} onClick={toggleCheap}>Under ₹{cap}</button>
            </div>
            <p className="count">
              {list.length} item{list.length === 1 ? '' : 's'}
              {subTab ? ` in ${subTab.toLowerCase()}` : ''}
            </p>

            {list.length ? (
              <div className="pgrid" ref={gridRef}>
                {list.map((p, i) => (
                  <Fragment key={p.id}>
                    {showXsell && i === xsellAt && (
                      <button key="xsell" className="xsell" onClick={() => router.push(`/kit?prompt=${encodeURIComponent(xsell.prompt)}`)}>
                        <span className="xs-art">
                          <ProductArt artKey={xsell.art} />
                        </span>
                        <span className="xs-text">
                          <small>{xsell.q}</small>
                          <b>{xsell.t}</b>
                          <span>{xsell.sub}</span>
                        </span>
                        <span className="xs-go" aria-hidden>
                          <Icon name="arrow" />
                        </span>
                      </button>
                    )}
                    <ProductTile product={p} />
                  </Fragment>
                ))}
              </div>
            ) : (
              <div className="catempty">
                <h2>Nothing matches</h2>
                <p className="muted">Try removing a filter.</p>
                <button className="btn" onClick={clearFilters}>Clear filters</button>
              </div>
            )}
          </>
        )}
        </div>
      </div>

      {sortSheetOpen && (
        <div className="sheetback" onClick={(e) => e.target === e.currentTarget && setSortSheetOpen(false)}>
          <div className="sheet" role="dialog" aria-label="Sort">
            <p className="font-display" style={{ fontSize: 24, marginBottom: 6 }}>Sort by</p>
            {SORT_OPTIONS.map((opt) => (
              <button key={opt.key} className="opt" role="radio" aria-checked={sortMode === opt.key} onClick={() => applySort(opt.key)}>
                <span className="radio" />
                <span><b>{opt.label}</b></span>
                <span />
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
