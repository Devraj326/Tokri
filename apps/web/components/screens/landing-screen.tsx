'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ProductArt, type ArtKey } from '../ui/product-art';
import { BasketCanvas } from '../three/basket-canvas';

const BAND_WORDS = ['Sabzi', 'सब्ज़ी', 'Dairy', 'मसाले', 'Tools', 'नमकीन', 'Stationery', 'औज़ार'];

const TOKRI_ROWS: [string, string, string][] = [['milk', 'haldi', 'You'], ['butter', 'methi', 'Riya'], ['chips', 'mirchi', 'Aman'], ['biscuit', 'methi', 'Riya']];
const TOKRI_LIVE_EXTRA: [string, string, string][] = [
  ['tamatar', 'mirchi', 'Aman'],
  ['bread', 'haldi', 'You'],
  ['pyaz', 'methi', 'Riya'],
  ['adrak', 'clay', 'Kabir'],
  ['milk', 'methi', 'Riya'],
];
const TOKRI_ART: Record<string, ArtKey> = { milk: 'milk', butter: 'butter', chips: 'chips', biscuit: 'biscuit', tamatar: 'tomato', bread: 'bread', pyaz: 'onion', adrak: 'ginger' };
const TOKRI_AVATAR_COLOR: Record<string, string> = { haldi: 'var(--haldi)', methi: '#8DBB8F', mirchi: '#EE8C82', clay: '#E3A27F' };

export function LandingScreen() {
  const [liveRows, setLiveRows] = useState<{ key: string; art: string; tint: string; who: string; justAdded: boolean }[]>(
    TOKRI_ROWS.map(([art, tint, who], i) => ({ key: `seed-${i}`, art, tint, who, justAdded: false })),
  );

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let i = 0;
    const iv = setInterval(() => {
      const [art, tint, who] = TOKRI_LIVE_EXTRA[i++ % TOKRI_LIVE_EXTRA.length];
      setLiveRows((rows) => [{ key: `live-${Date.now()}-${i}`, art, tint, who, justAdded: true }, ...rows.slice(0, 3)]);
    }, 2600);
    return () => clearInterval(iv);
  }, []);

  return (
    <div className="landing" style={{ minHeight: '100%', overflowX: 'hidden' }}>
      <header
        className="lnav"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '22px clamp(18px,4vw,56px)', borderBottom: '2px solid var(--ink)', gap: 16 }}
      >
        <div className="font-display" style={{ fontSize: 30, letterSpacing: '-.03em', lineHeight: 1 }}>
          tokri<span className="font-devanagari" style={{ fontSize: 17, fontWeight: 400, color: 'var(--clay)', marginLeft: 6 }}>टोकरी</span>
        </div>
        <nav className="hidden items-center gap-6 font-medium sm:flex" style={{ fontWeight: 500 }}>
          <a href="#together" style={{ color: 'inherit', textDecoration: 'none' }}>Shop together</a>
          <a href="#kits" style={{ color: 'inherit', textDecoration: 'none' }}>Kits</a>
          <Link href="/login" className="btn primary">Order now</Link>
        </nav>
      </header>

      <section
        className="hero"
        style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', alignItems: 'center', minHeight: 620, padding: '40px clamp(18px,4vw,56px)', position: 'relative', gap: 24 }}
      >
        <div style={{ position: 'relative', zIndex: 1 }}>
          <span className="stamp" style={{ fontSize: 20, marginBottom: 26, display: 'inline-block' }}>10 MIN</span>
          <h1 className="font-display" style={{ fontSize: 'clamp(48px,7.2vw,108px)', lineHeight: 0.92, letterSpacing: '-.035em' }}>
            Tell us what you&rsquo;re making. Bring everyone.
          </h1>
          <p style={{ fontSize: 18, maxWidth: '46ch', margin: '26px 0 30px' }}>
            Groceries, masala, tools and stationery at your door in about 12 minutes. Fill one cart with your
            flatmates, or describe a dish or a repair and get the full list.
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Link href="/login" className="btn primary">Order now</Link>
            <a href="#together" className="btn ghost">How shared carts work</a>
          </div>
        </div>
        <div style={{ position: 'relative', height: 'min(560px,70vw)' }}>
          <BasketCanvas className="h-full w-full" />
          <p className="small" style={{ position: 'absolute', bottom: 8, left: 0, right: 0, textAlign: 'center', color: 'var(--muted)' }}>
            Scroll to turn the basket
          </p>
        </div>
        <div
          aria-hidden
          className="font-devanagari"
          style={{
            position: 'absolute', right: '-2%', bottom: '-6%', fontSize: 'clamp(140px,22vw,330px)', lineHeight: 1,
            color: 'transparent', WebkitTextStroke: '2px var(--dust)', pointerEvents: 'none', userSelect: 'none', zIndex: 0,
          }}
        >
          टोकरी
        </div>
      </section>

      <div className="band" aria-hidden style={{ background: 'var(--ink)', color: 'var(--paper)', display: 'flex', gap: 42, padding: '18px 0', overflow: 'hidden', whiteSpace: 'nowrap', fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 500 }}>
        <div className="marquee-track">
          {[...BAND_WORDS, ...BAND_WORDS].map((w, i) => (
            <span key={i} className={i % 2 ? 'font-devanagari' : ''} style={i % 2 ? { color: 'var(--haldi)', fontWeight: 400 } : undefined}>
              {w}
            </span>
          ))}
        </div>
      </div>

      <section
        id="together"
        className="story"
        style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'clamp(24px,5vw,80px)', padding: '90px clamp(18px,4vw,56px)', alignItems: 'center', borderBottom: '2px solid var(--ink)' }}
      >
        <div>
          <h2 className="font-display" style={{ fontSize: 'clamp(38px,5vw,68px)', lineHeight: 0.95, letterSpacing: '-.03em', marginBottom: 22 }}>
            One cart for the whole flat.
          </h2>
          <p style={{ fontSize: 17, maxWidth: '48ch' }}>
            Start a Tokri, share the link, and everyone adds from their own phone. You see who added what, the
            free-delivery meter fills faster, and the bill splits itself.
          </p>
          <ol style={{ listStyle: 'none', counterReset: 's', marginTop: 26, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {['Start a Tokri and pick the delivery address.', 'Share the link or QR on WhatsApp. Friends join with their number.', 'Lock the cart, choose how to split, and pay once.'].map((step, i) => (
              <li key={i} style={{ display: 'grid', gridTemplateColumns: '44px 1fr', alignItems: 'start', gap: 12, fontSize: 16 }}>
                <span className="font-display" style={{ fontSize: 22, width: 40, height: 40, border: '2px solid var(--ink)', borderRadius: '50%', display: 'grid', placeItems: 'center', background: 'var(--haldi)', color: 'var(--on-accent)' }}>
                  {i + 1}
                </span>
                <span style={{ paddingTop: 6 }}>{step}</span>
              </li>
            ))}
          </ol>
        </div>
        <div className="card" style={{ padding: 18, transform: 'rotate(1.5deg)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <b className="font-display" style={{ fontSize: 22 }}>Flat 302 Sunday run</b>
            <div style={{ display: 'flex' }}>
              {['Y', 'R', 'A'].map((n, i) => (
                <span key={n} style={{ marginLeft: i ? -8 : 0, width: 30, height: 30, borderRadius: '50%', border: '2px solid var(--ink)', display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 600, background: ['var(--haldi)', '#8DBB8F', '#EE8C82'][i] }}>
                  {n}
                </span>
              ))}
            </div>
          </div>
          {liveRows.map((row, i) => (
            <div
              key={row.key}
              className={row.justAdded ? 'landing-live-in' : undefined}
              style={{ display: 'grid', gridTemplateColumns: '44px 1fr auto', gap: 12, alignItems: 'center', padding: '10px 0', borderBottom: i < liveRows.length - 1 ? '1.5px dashed var(--dust)' : undefined, borderRadius: 8 }}
            >
              <div className="ptile t-dust" style={{ padding: 6, borderRadius: 8 }}>
                <ProductArt artKey={TOKRI_ART[row.art]} />
              </div>
              <div>
                <b>{row.art}</b>
                <br />
                <span className="small" style={{ color: 'var(--muted)' }}>Added by {row.who}</span>
              </div>
              <span style={{ width: 24, height: 24, borderRadius: '50%', border: '2px solid var(--ink)', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 600, background: TOKRI_AVATAR_COLOR[row.tint] ?? 'var(--dust)' }}>{row.who[0]}</span>
            </div>
          ))}
          <div style={{ marginTop: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span>₹466 of ₹1,500</span>
              <span style={{ color: 'var(--methi)', fontWeight: 600 }}>Free delivery</span>
            </div>
            <div style={{ height: 14, border: '2px solid var(--ink)', borderRadius: 999, overflow: 'hidden', background: 'var(--card)', marginTop: 6 }}>
              <div style={{ height: '100%', width: '31%', background: 'var(--haldi)', borderRight: '2px solid var(--ink)' }} />
            </div>
          </div>
        </div>
      </section>

      <section
        id="kits"
        className="story"
        style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'clamp(24px,5vw,80px)', padding: '90px clamp(18px,4vw,56px)', alignItems: 'center', borderBottom: '2px solid var(--ink)' }}
      >
        <div style={{ order: 2 }}>
          <h2 className="font-display" style={{ fontSize: 'clamp(38px,5vw,68px)', lineHeight: 0.95, letterSpacing: '-.03em', marginBottom: 22 }}>
            Type a dish or a fix. Get the list.
          </h2>
          <p style={{ fontSize: 17, maxWidth: '48ch' }}>
            &ldquo;Aloo ki sabzi for 4.&rdquo; &ldquo;Laptop not charging.&rdquo; Tokri lists every ingredient or tool
            you need, checks what your store has right now, and suggests swaps for the rest.
          </p>
          <div style={{ marginTop: 26 }}>
            <Link href="/kit?prompt=Aloo%20ki%20sabzi%20for%204" className="btn ink-fill">Try a kit</Link>
          </div>
        </div>
        <div className="card" style={{ padding: 18, transform: 'rotate(-1.5deg)' }}>
          <p className="small" style={{ color: 'var(--muted)' }}>You asked</p>
          <p className="font-display" style={{ fontSize: 26, marginBottom: 8 }}>Aloo ki sabzi for 4</p>
          {[['potato', '750 g', 'In stock', 'var(--methi)'], ['onion', '2 medium', 'In stock', 'var(--methi)'], ['jar', '1 tsp', 'Swap: jeera powder', 'var(--clay)'], ['leaf', '1 bunch', 'In stock', 'var(--methi)']].map(([art, q, b, c], i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '44px 1fr auto', gap: 12, alignItems: 'center', padding: '10px 0', borderBottom: i < 3 ? '1.5px dashed var(--dust)' : undefined }}>
              <div className="ptile t-dust" style={{ padding: 6, borderRadius: 8 }}>
                <ProductArt artKey={art as any} />
              </div>
              <div>
                <b>{q}</b>
              </div>
              <span className="small" style={{ color: c, fontWeight: 600 }}>{b}</span>
            </div>
          ))}
          <Link href="/kit?prompt=Aloo%20ki%20sabzi%20for%204" className="btn primary block" style={{ marginTop: 12 }}>
            Add all 9 in stock
          </Link>
        </div>
      </section>

      <footer className="lfoot" style={{ padding: '50px clamp(18px,4vw,56px) 70px', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20, alignItems: 'flex-end' }}>
        <div className="font-display" style={{ fontSize: 'clamp(40px,6vw,84px)', letterSpacing: '-.03em', lineHeight: 0.95 }}>Kuch toh le lo.</div>
        <p className="small" style={{ color: 'var(--muted)' }}>Tokri — groceries, masala, tools and stationery at your door.</p>
      </footer>

      <style jsx global>{`
        @media (max-width: 860px) {
          .hero { grid-template-columns: 1fr !important; min-height: 0 !important; padding-top: 70px !important; }
          .story { grid-template-columns: 1fr !important; padding: 60px 18px !important; }
        }
        .landing-live-in { animation: landingLiveIn .55s cubic-bezier(.2,.8,.2,1); }
        @keyframes landingLiveIn {
          from { opacity: 0; transform: translateY(-10px); background: color-mix(in srgb, var(--haldi) 40%, transparent); }
        }
        @media (prefers-reduced-motion: reduce) {
          .landing-live-in { animation: none; }
        }
      `}</style>
    </div>
  );
}
