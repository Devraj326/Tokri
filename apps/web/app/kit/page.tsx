'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { AppBar } from '../../components/layout/app-bar';
import { Icon } from '../../components/ui/icons';
import { ProductArt, type ArtKey } from '../../components/ui/product-art';
import { useKitHistory } from '../../lib/hooks/use-kit-history';
import { KIT_MODES, type KitModeKey } from '../../lib/kit-meta';

const MODE_KEYS = Object.keys(KIT_MODES) as KitModeKey[];

// Hardcoded, matching the prototype — not backed by real usage analytics.
const MADE: { title: string; art: ArtKey; items: number; from: number; count: number }[] = [
  { title: 'Aloo ki sabzi for 4', art: 'pot', items: 12, from: 86, count: 142 },
  { title: 'Fix a leaking tap', art: 'screwdriver', items: 6, from: 249, count: 38 },
  { title: 'House party for 10', art: 'chips', items: 9, from: 420, count: 64 },
  { title: 'Deep-clean the bathroom', art: 'bottle', items: 6, from: 178, count: 27 },
  { title: 'Laptop not charging', art: 'meter', items: 7, from: 349, count: 19 },
];

export default function KitPromptPage() {
  const router = useRouter();
  const params = useSearchParams();
  const { history } = useKitHistory();

  const [mode, setMode] = useState<KitModeKey>('cook');
  const [prompt, setPrompt] = useState('');
  const [people, setPeople] = useState<Record<KitModeKey, number>>({ cook: 4, fix: 1, clean: 1, host: 10 });
  const [listening, setListening] = useState(false);
  const [wobble, setWobble] = useState(false);
  const recognitionRef = useRef<any>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const initial = params.get('prompt');
    const initialMode = params.get('mode') as KitModeKey | null;
    if (initial) setPrompt(initial);
    if (initialMode && KIT_MODES[initialMode]) setMode(initialMode);
  }, [params]);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const rec = new SpeechRecognition();
    rec.lang = 'en-IN';
    rec.interimResults = false;
    rec.onresult = (e: any) => setPrompt((p) => (p ? p + ' ' : '') + e.results[0][0].transcript);
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

  function switchMode(key: KitModeKey) {
    if (key === mode) return;
    setMode(key);
    setWobble(true);
    setTimeout(() => setWobble(false), 450);
  }

  function adjustPeople(delta: number) {
    setPeople((p) => ({ ...p, [mode]: Math.min(30, Math.max(1, p[mode] + delta)) }));
  }

  function submit() {
    const value = (textRef.current?.value || prompt).trim() || m.placeholder;
    const query = m.people ? `?prompt=${encodeURIComponent(value)}&servings=${people[mode]}` : `?prompt=${encodeURIComponent(value)}`;
    router.push(`/kit/result${query}`);
  }

  const m = KIT_MODES[mode];

  return (
    <>
      <AppBar title="Kit Bana Do" backHref="/" />
      <section className="kd-hero">
        <span className="deva font-devanagari">किट बना दो</span>
        <h2>
          Tell us the plan.
          <br />
          We&rsquo;ll write the parchi.
        </h2>
      </section>

      <div className="modes" role="tablist" aria-label="What kind of plan">
        {MODE_KEYS.map((key) => {
          const x = KIT_MODES[key];
          return (
            <button key={key} role="tab" aria-selected={key === mode} className={`mode t-${x.tint}`} onClick={() => switchMode(key)}>
              <span aria-hidden>
                <ProductArt artKey={x.art} tint={x.tint} />
              </span>
              {x.label}
            </button>
          );
        })}
      </div>

      <section className={`parchi${wobble ? ' wobble' : ''}`}>
        <span className="tape" aria-hidden />
        <div className="parchi-head hand">
          <span>Parchi no. {String(42 + history.length).padStart(3, '0')}</span>
          <span>{new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
        </div>
        <label htmlFor="kp" className="sr" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden' }}>Describe your plan</label>
        <textarea
          id="kp"
          ref={textRef}
          className="parchi-text hand"
          rows={3}
          placeholder={m.placeholder}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />
        <div className="parchi-tools">
          {recognitionRef.current && (
            <button className="mic" id="mic" aria-label="Speak instead" onClick={toggleVoice} style={{ background: listening ? 'var(--mirchi)' : undefined, color: listening ? '#fff' : undefined }}>
              <Icon name="mic" />
            </button>
          )}
          {m.people ? (
            <div className="people">
              <span className="small">{mode === 'host' ? 'Guests' : 'Cooking for'}</span>
              <div className="step">
                <button onClick={() => adjustPeople(-1)} aria-label="Fewer people">−</button>
                <span>{people[mode]}</span>
                <button onClick={() => adjustPeople(1)} aria-label="More people">+</button>
              </div>
            </div>
          ) : (
            <span className="small" style={{ color: '#6B6458' }}>We add a safety note when it needs one.</span>
          )}
        </div>
        <button className="btn primary block" onClick={submit}>
          Write my parchi <Icon name="arrow" className="h-[18px] w-[18px]" />
        </button>
      </section>

      <section className="sblock">
        <header><h3>Try one of these</h3></header>
        <div className="chips">
          {m.examples.map((t) => (
            <button key={t} className="chip" onClick={() => setPrompt(t)}>{t}</button>
          ))}
        </div>
      </section>

      <section className="sblock">
        <header><h3>Made near you today</h3></header>
        <div className="madecards">
          {MADE.map((k) => (
            <button key={k.title} className="made" onClick={() => router.push(`/kit/result?prompt=${encodeURIComponent(k.title)}`)}>
              <span className="m-art" aria-hidden>
                <ProductArt artKey={k.art} />
              </span>
              <b>{k.title}</b>
              <small>{k.items} things, from ₹{k.from}</small>
              <span className="m-meta">Made {k.count} times today</span>
            </button>
          ))}
        </div>
      </section>

      {history.length > 0 && (
        <section className="sblock">
          <header><h3>Your recent parchis</h3></header>
          {history.slice(0, 3).map((h) => (
            <button key={h.prompt} className="recentp" onClick={() => router.push(`/kit/result?prompt=${encodeURIComponent(h.prompt)}`)}>
              <span className="hand">{h.prompt}</span>
              <small className="muted">{h.itemCount} things</small>
              <Icon name="arrow" />
            </button>
          ))}
        </section>
      )}

      <div style={{ height: 24 }} />
    </>
  );
}
