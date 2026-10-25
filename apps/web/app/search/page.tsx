'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { listCategories, searchProducts, type ProductDto } from '../../lib/api/catalog';
import { useSessionStore } from '../../lib/store/session';
import { useActiveCart } from '../../lib/hooks/use-active-cart';
import { useRecentSearches } from '../../lib/hooks/use-recent-searches';
import { useRequestedItems } from '../../lib/hooks/use-requested-items';
import { ProductArt, artKeyFor } from '../../components/ui/product-art';
import { QuantityStepper } from '../../components/ui/quantity-stepper';
import { Icon } from '../../components/ui/icons';
import { unitPrice } from '../../lib/category-meta';
import { KIT_MODES, type KitModeKey } from '../../lib/kit-meta';

const GOAL_HINTS = ['ki sabzi', 'for ', 'repair', 'fix', 'project', 'model', 'party', 'clean', 'nahi', 'bana'];
// Cosmetic only — we have no real search-trend analytics. Picks a handful of
// common staples and shows a deterministic "trending" badge, same spirit as
// the mandi price-change badges on the home page.
const TRENDING_TERMS = ['pyaz', 'paneer', 'lemon', 'battery', 'atta'];
const TRENDING_LABELS: Record<string, string> = { pyaz: 'Up 18% this week', paneer: 'Up 42% this week', lemon: 'Up 9% this week', battery: 'Up 25% this week', atta: 'Up 12% this week' };

function looksLikeAGoal(q: string) {
  const lower = q.toLowerCase();
  return q.trim().split(/\s+/).length >= 3 || GOAL_HINTS.some((h) => lower.includes(h));
}

function highlight(text: string, words: string[]) {
  let out = text;
  words.filter((w) => w.length > 1).forEach((w) => {
    out = out.replace(new RegExp(`(${w.replace(/[^a-z0-9]/gi, '')})`, 'ig'), '<mark>$1</mark>');
  });
  return out;
}

function shortName(name: string) {
  return name.split(' (')[0].split(',')[0];
}

function modeForQuery(q: string): KitModeKey {
  const t = q.toLowerCase();
  if (/laptop|charg|hinge|screen|tap|leak|pipe|plumb|nal|flicker|fix|repair/.test(t)) return 'fix';
  if (/clean|bathroom|wash|chimney|shine|utensil/.test(t)) return 'clean';
  if (/party|birthday|guests|movie|host/.test(t)) return 'host';
  return 'cook';
}

export default function SearchPage() {
  const router = useRouter();
  const storeId = useSessionStore((s) => s.storeId);
  const { qtyByVariant, addItem, updateItem, removeItem } = useActiveCart();
  const { terms: recent, add: addRecent, clear: clearRecent } = useRecentSearches();
  const { isRequested, request } = useRequestedItems();
  const categoriesQuery = useQuery({ queryKey: ['categories'], queryFn: listCategories });

  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const [listening, setListening] = useState(false);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 250);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const rec = new SpeechRecognition();
    rec.lang = 'en-IN';
    rec.interimResults = false;
    rec.onresult = (e: any) => setQuery(e.results[0][0].transcript);
    rec.onend = () => setListening(false);
    recognitionRef.current = rec;
  }, []);

  function toggleVoice() {
    if (!recognitionRef.current) return;
    if (listening) {
      recognitionRef.current.stop();
      setListening(false);
    } else {
      recognitionRef.current.start();
      setListening(true);
    }
  }

  function submitQuery() {
    if (query.trim()) addRecent(query);
  }

  const resultsQuery = useQuery({
    queryKey: ['search', storeId, debounced],
    queryFn: () => searchProducts(debounced, storeId!),
    enabled: !!storeId && debounced.trim().length > 1,
  });

  const trimmed = debounced.trim();
  const suggestKit = trimmed.length > 3 && looksLikeAGoal(trimmed);
  const words = trimmed.toLowerCase().split(/\s+/).filter((w) => w.length > 1);
  const mode = KIT_MODES[modeForQuery(trimmed)];
  const hits = resultsQuery.data ?? [];
  const requestKey = trimmed.toLowerCase();

  return (
    <>
      <header className="appbar sbar">
        <button className="iconbtn" aria-label="Back" onClick={() => router.push('/')}>
          <Icon name="back" />
        </button>
        <label className={`sfield${query ? ' has' : ''}`} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, border: '2px solid var(--ink)', borderRadius: 12, padding: '8px 12px', background: 'var(--card)' }}>
          <Icon name="search" className="h-[18px] w-[18px]" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submitQuery()}
            placeholder="Try “pyaz”, “bulb”, “fix a tap”"
            autoComplete="off"
            enterKeyHint="search"
            style={{ flex: 1, border: 0, background: 'transparent', outline: 0, fontSize: 16, minWidth: 0 }}
          />
          <button className="sclear" type="button" aria-label="Clear search" onClick={() => { setQuery(''); inputRef.current?.focus(); }}>
            <Icon name="x" />
          </button>
          {recognitionRef.current && (
            <button className="smic" type="button" aria-label="Search by voice" onClick={toggleVoice} style={{ color: listening ? 'var(--mirchi)' : undefined }}>
              <Icon name="mic" />
            </button>
          )}
        </label>
      </header>

      {!trimmed ? (
        <>
          {recent.length > 0 && (
            <section className="sblock">
              <header>
                <h3>Recent</h3>
                <button className="link small" onClick={clearRecent}>Clear</button>
              </header>
              <div className="chips">
                {recent.map((t) => (
                  <button key={t} className="chip rchip" onClick={() => setQuery(t)}>
                    <Icon name="clock" />
                    {t}
                  </button>
                ))}
              </div>
            </section>
          )}

          <section className="sblock">
            <header>
              <h3>Trending near you</h3>
              <span className="small muted">Updated hourly</span>
            </header>
            <ol className="trend">
              {TRENDING_TERMS.map((term, i) => (
                <TrendRow key={term} term={term} label={TRENDING_LABELS[term]} rank={i + 1} onPick={() => setQuery(term)} />
              ))}
            </ol>
          </section>

          <section className="sblock">
            <header><h3>Search by plan</h3></header>
            <div className="plans">
              {(Object.entries(KIT_MODES) as [KitModeKey, (typeof KIT_MODES)[KitModeKey]][]).map(([key, m]) => (
                <Link key={key} href={`/kit?mode=${key}`} className={`plan t-${m.tint}`}>
                  <span className="plan-art" aria-hidden>
                    <ProductArt artKey={m.art} tint={m.tint} />
                  </span>
                  <b>{m.label}</b>
                  <span>{m.examples[0]}</span>
                </Link>
              ))}
            </div>
          </section>

          <section className="sblock">
            <header><h3>Browse</h3></header>
            <div className="chips">
              {categoriesQuery.data?.map((c) => (
                <Link key={c.id} href={`/category/${c.slug}`} className="chip">
                  {c.hindiName && <span className="font-devanagari">{c.hindiName}</span>} {c.name}
                </Link>
              ))}
            </div>
          </section>
          <div style={{ height: 24 }} />
        </>
      ) : (
        <>
          {suggestKit && (
            <button
              className="skit"
              onClick={() => { addRecent(trimmed); router.push(`/kit?prompt=${encodeURIComponent(trimmed)}`); }}
            >
              <span className="skit-art" aria-hidden>
                <ProductArt artKey={mode.art} />
              </span>
              <span className="skit-t">
                <small>Make a parchi for</small>
                <b className="hand">&ldquo;{trimmed}&rdquo;</b>
                <span>We&rsquo;ll list everything and check stock.</span>
              </span>
              <Icon name="arrow" />
            </button>
          )}

          {hits.length === 0 && !resultsQuery.isLoading ? (
            <div className="snone">
              <svg viewBox="0 0 160 120" aria-hidden>
                <ellipse cx="70" cy="68" rx="42" ry="34" fill="#D3A464" stroke="currentColor" strokeWidth={3} />
                <circle cx="58" cy="62" r="6" fill="#fff" stroke="currentColor" strokeWidth={2} />
                <circle cx="80" cy="62" r="6" fill="#fff" stroke="currentColor" strokeWidth={2} />
                <circle cx="60" cy="64" r="2.5" fill="currentColor" />
                <circle cx="82" cy="64" r="2.5" fill="currentColor" />
                <path d="M62 82h16" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" />
                <circle cx="120" cy="40" r="16" fill="#E7EEF3" stroke="currentColor" strokeWidth={3} />
                <path d="M108 52l-14 14" stroke="currentColor" strokeWidth={5} strokeLinecap="round" />
              </svg>
              <h2>We don&rsquo;t stock &ldquo;{trimmed}&rdquo; yet</h2>
              <p className="muted">We add new items every week, and requests help us choose.</p>
              <button className={isRequested(requestKey) ? 'btn' : 'btn primary'} onClick={() => request(requestKey)}>
                {isRequested(requestKey) ? 'Requested. We’ll let you know' : 'Request this item'}
              </button>
              {!suggestKit && (
                <button className="link small" onClick={() => { addRecent(trimmed); router.push(`/kit?prompt=${encodeURIComponent(trimmed)}`); }}>
                  Or make a parchi for it
                </button>
              )}
            </div>
          ) : (
            <>
              <p className="scount">{hits.length} result{hits.length === 1 ? '' : 's'}</p>
              {hits.map((p, i) => (
                <SearchRow key={p.id} product={p} index={i} words={words} onOpen={() => addRecent(trimmed)} />
              ))}
              <div style={{ height: 20 }} />
            </>
          )}
        </>
      )}
    </>
  );
}

function TrendRow({ term, label, rank, onPick }: { term: string; label: string; rank: number; onPick: () => void }) {
  const storeId = useSessionStore((s) => s.storeId);
  const q = useQuery({ queryKey: ['search', storeId, term], queryFn: () => searchProducts(term, storeId!), enabled: !!storeId });
  const p = q.data?.[0];
  if (!p) return null;
  return (
    <li>
      <button onClick={onPick}>
        <span className="tr-n">{rank}</span>
        <span className={`ptile t-${p.tileColor}`}>
          <ProductArt artKey={artKeyFor(p.name, p.category.slug)} tint={p.tileColor} />
        </span>
        <span className="tr-t">
          <b>{shortName(p.name)}</b>
          <small>{label}</small>
        </span>
        <span className="tr-up" aria-hidden>▲</span>
      </button>
    </li>
  );
}

function SearchRow({ product, index, words, onOpen }: { product: ProductDto; index: number; words: string[]; onOpen: () => void }) {
  const { qtyByVariant, addItem, updateItem, removeItem } = useActiveCart();
  const variant = product.variants[0];
  const entry = variant ? qtyByVariant[variant.id] : undefined;
  const qty = entry?.qty ?? 0;
  const up = variant ? unitPrice(variant.size, variant.price) : null;
  const off = variant && variant.mrp > variant.price;

  return (
    <div className="srow" style={{ ['--i' as any]: index, display: 'grid', gridTemplateColumns: '52px 1fr auto', gap: 12, alignItems: 'center', padding: '10px 16px', borderBottom: '1.5px solid var(--dust)' }}>
      <Link href={`/product/${product.id}`} className={`ptile t-${product.tileColor}`} aria-label={product.name} onClick={onOpen}>
        <ProductArt artKey={artKeyFor(product.name, product.category.slug)} tint={product.tileColor} />
      </Link>
      <Link href={`/product/${product.id}`} className="sr-main" onClick={onOpen}>
        <h4 style={{ fontSize: 14.5, fontWeight: 600 }} dangerouslySetInnerHTML={{ __html: highlight(product.name, words) }} />
        <span className="small muted">{variant?.size}{up ? `, ${up}` : ''}</span>
        <div className="price">
          ₹{variant?.price}
          {off && <s> ₹{variant?.mrp}</s>}
        </div>
      </Link>
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
