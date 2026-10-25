'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AppBar } from '../../components/layout/app-bar';
import { Icon } from '../../components/ui/icons';
import { updateProfile } from '../../lib/api/auth';
import { ApiError } from '../../lib/api/client';
import { nearestStore } from '../../lib/api/catalog';
import { useAuthStore } from '../../lib/store/auth';
import { useSessionStore } from '../../lib/store/session';
import { safeNextPath } from '../../lib/safe-next-path';

const FALLBACK_LAT = 12.9716;
const FALLBACK_LNG = 77.6412;

export default function OnboardingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNextPath(searchParams.get('next'));
  const setUser = useAuthStore((s) => s.setUser);
  const setLocation = useSessionStore((s) => s.setLocation);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'locating' | 'checked' | 'denied'>('idle');
  const [result, setResult] = useState<{ serviceable: boolean; storeId: string | null; storeName: string | null; etaMinutes: number | null } | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [saving, setSaving] = useState(false);

  async function checkLocation(lat: number, lng: number) {
    setCoords({ lat, lng });
    const res = await nearestStore(lat, lng);
    setResult(res);
    setStatus('checked');
    if (res.serviceable && res.storeId && res.storeName && res.etaMinutes != null) {
      setLocation({ storeId: res.storeId, storeName: res.storeName, etaMinutes: res.etaMinutes, lat, lng });
    }
  }

  function requestLocation() {
    setStatus('locating');
    if (!navigator.geolocation) {
      checkLocation(FALLBACK_LAT, FALLBACK_LNG);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => checkLocation(pos.coords.latitude, pos.coords.longitude),
      () => {
        setStatus('denied');
        checkLocation(FALLBACK_LAT, FALLBACK_LNG);
      },
      { timeout: 8000 },
    );
  }

  async function handleContinue() {
    if (phone.trim() && !/^[6-9]\d{9}$/.test(phone.trim())) {
      setPhoneError('Enter a valid 10-digit Indian mobile number, or leave it blank.');
      return;
    }
    setSaving(true);
    try {
      if (name.trim() || phone.trim()) {
        setUser(await updateProfile({ name: name.trim() || undefined, phone: phone.trim() || undefined }));
      }
      router.push(next ?? '/');
    } catch (err) {
      setPhoneError(err instanceof ApiError ? err.message : 'Could not save your details. Try again.');
    } finally {
      setSaving(false);
    }
  }

  const located = status === 'checked' || status === 'denied';

  return (
    <>
      <AppBar title="Almost there" backHref="/login" />
      <div className="pad stack" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label className="lbl" htmlFor="nm">What should we call you?</label>
          <input id="nm" className="field" placeholder="First name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <div>
          <label className="lbl" htmlFor="ph">Mobile number (for your rider to reach you)</label>
          <div style={{ display: 'flex', border: '2px solid var(--ink)', borderRadius: 12, background: 'var(--paper)', overflow: 'hidden' }}>
            <span className="tabular-price" style={{ padding: '10px 12px', borderRight: '2px solid var(--ink)', fontWeight: 600, background: 'var(--dust)' }}>+91</span>
            <input
              id="ph"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value.replace(/\D/g, '').slice(0, 10));
                setPhoneError(null);
              }}
              inputMode="numeric"
              autoComplete="tel-national"
              maxLength={10}
              placeholder="98765 43210 (optional)"
              className="tabular-price"
              style={{ flex: 1, border: 0, background: 'transparent', padding: 10, fontSize: 16, letterSpacing: '.05em', minWidth: 0, outline: 0 }}
            />
          </div>
          {phoneError && <p className="small" style={{ color: 'var(--mirchi)', fontWeight: 600, marginTop: 6 }}>{phoneError}</p>}
        </div>

        <div>
          <span className="lbl">Where should we deliver?</span>
          <div style={{ border: '2px solid var(--ink)', borderRadius: 14, overflow: 'hidden', background: 'var(--dust)', position: 'relative' }}>
            <svg viewBox="0 0 340 200" aria-hidden>
              <rect width="340" height="200" fill="var(--dust)" />
              <path d="M0 60h340M0 140h340M90 0v200M230 0v200M150 60l80 80" stroke="var(--paper)" strokeWidth={12} />
              <path d="M0 100h340" stroke="var(--paper)" strokeWidth={5} />
              <rect x="250" y="12" width="70" height="38" rx="6" fill="#C5D8BE" />
              <text x="285" y="35" fontSize={10} textAnchor="middle" fill="#1B1A17">Park</text>
              <g style={{ transition: 'transform .5s cubic-bezier(.3,1.8,.5,1)', transform: `translateY(${located ? 0 : -30}px)`, opacity: located ? 1 : 0.35 }}>
                <path d="M170 102s-16-15-16-28a16 16 0 0132 0c0 13-16 28-16 28z" fill="var(--mirchi)" stroke="#1B1A17" strokeWidth={2.5} />
                <circle cx="170" cy="74" r="5.5" fill="#FFFDF8" stroke="#1B1A17" strokeWidth={2} />
              </g>
            </svg>
          </div>
        </div>

        <button className="btn ghost block" onClick={requestLocation} disabled={status === 'locating'}>
          <Icon name="pin" className="h-[18px] w-[18px]" /> {status === 'locating' ? 'Locating…' : 'Use my current location'}
        </button>

        {located && result && (
          <div className="row" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {result.serviceable ? (
              <>
                <span className="stamp green">{result.etaMinutes} MIN</span>
                <p className="small">
                  <b>We deliver here.</b>
                  <br />
                  {result.storeName}
                </p>
              </>
            ) : (
              <span className="stamp">Not serviceable here yet</span>
            )}
          </div>
        )}

        <button className="btn primary block" disabled={saving || !coords} onClick={handleContinue}>
          {saving ? 'Saving…' : 'Start shopping'}
        </button>
      </div>
    </>
  );
}
