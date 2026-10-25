'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlooMascot3D, type MascotState } from '../../components/three/aloo-mascot-3d';
import { OtpInput } from '../../components/ui/otp-input';
import { sendEmailOtp, verifyOtp } from '../../lib/api/auth';
import { ApiError } from '../../lib/api/client';
import { useAuthStore } from '../../lib/store/auth';
import { safeNextPath } from '../../lib/safe-next-path';

type Step = 'email' | 'otp';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNextPath(searchParams.get('next'));
  const setAuth = useAuthStore((s) => s.setAuth);

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const [requestId, setRequestId] = useState<string | null>(null);
  const [otp, setOtp] = useState<string[]>(Array(6).fill(''));
  const [showOtp, setShowOtp] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [devOtp, setDevOtp] = useState<string | null>(null);

  const [mascotState, setMascotState] = useState<MascotState>('idle');
  const [bubble, setBubble] = useState('');
  const revertTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isValid = EMAIL_RE.test(email);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setInterval(() => setResendIn((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [resendIn]);

  function pulse(state: MascotState, revertTo: MascotState, ms: number) {
    setMascotState(state);
    if (revertTimer.current) clearTimeout(revertTimer.current);
    revertTimer.current = setTimeout(() => setMascotState(revertTo), ms);
  }

  function onEmailChange(raw: string) {
    setEmail(raw);
    setEmailTouched(true);
    setEmailError(null);
    setMascotState(raw.length ? 'watch' : 'idle');
  }

  function onEmailBlur() {
    if (!emailTouched || !email) return;
    if (EMAIL_RE.test(email)) pulse('happy', 'idle', 900);
    else pulse('tilt', 'idle', 1200);
  }

  async function handleSendOtp() {
    if (!isValid) {
      setEmailError('Enter a valid email address.');
      pulse('tilt', 'idle', 1200);
      return;
    }
    setSending(true);
    try {
      const res = await sendEmailOtp(email);
      setRequestId(res.requestId);
      setResendIn(res.resendAfter);
      setDevOtp(res.devOtp ?? null);
      setStep('otp');
      setMascotState('cover');
      setBubble('I’m not looking!');
    } catch (err) {
      setEmailError(err instanceof ApiError ? err.message : 'Could not send the code. Try again.');
    } finally {
      setSending(false);
    }
  }

  async function handleVerify(code: string) {
    if (!requestId || code.length !== 6) return;
    setVerifying(true);
    setOtpError(null);
    try {
      const res = await verifyOtp(requestId, code);
      setAuth(res.accessToken, res.user);
      setMascotState('jump');
      setBubble('Welcome in!');
      setTimeout(() => {
        if (res.isNewUser || !res.user.name) {
          router.push(next ? `/onboarding?next=${encodeURIComponent(next)}` : '/onboarding');
        } else {
          router.push(next ?? '/');
        }
      }, 1300);
    } catch (err) {
      setOtpError(err instanceof ApiError ? err.message : 'Hmm, that’s not it.');
      pulse('shake', 'cover', 1200);
      setBubble('Hmm, that’s not it.');
      setTimeout(() => setBubble('I’m not looking!'), 1300);
      setOtp(Array(6).fill(''));
    } finally {
      setVerifying(false);
    }
  }

  async function handleResend() {
    if (resendIn > 0) return;
    const res = await sendEmailOtp(email);
    setRequestId(res.requestId);
    setResendIn(res.resendAfter);
    setDevOtp(res.devOtp ?? null);
    setOtp(Array(6).fill(''));
  }

  const look = Math.min(1, email.length / 24);

  return (
    <div
      style={{
        minHeight: '100%', display: 'flex', flexDirection: 'column', padding: '26px 20px 22px',
        background: 'radial-gradient(circle at 85% 8%, color-mix(in srgb, var(--haldi) 30%, transparent) 0 120px, transparent 121px)',
      }}
    >
      <div className="font-display" style={{ fontSize: 26 }}>
        tokri<span className="font-devanagari" style={{ fontSize: 16, fontWeight: 400, marginLeft: 6, color: 'var(--clay)' }}>टोकरी</span>
      </div>
      <h1 className="font-display" style={{ fontSize: 40, lineHeight: 0.95, letterSpacing: '-.03em', margin: '28px 0 0', maxWidth: '10ch' }}>
        Groceries and everything else, in about 12 minutes.
      </h1>

      <div className="card" style={{ marginTop: 'auto', position: 'relative', padding: '22px 18px 18px' }}>
        <div style={{ position: 'absolute', right: 6, top: -150, width: 170, height: 170, pointerEvents: 'none' }}>
          <AlooMascot3D state={mascotState} look={look} className="h-full w-full" />
          {bubble && (
            <div
              style={{
                position: 'absolute', right: 150, top: 22, background: 'var(--card)', border: '2px solid var(--ink)',
                borderRadius: '14px 14px 2px 14px', padding: '6px 10px', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap',
              }}
            >
              {bubble}
            </div>
          )}
        </div>

        {step === 'email' ? (
          <>
            <label htmlFor="em" className="lbl">Email address</label>
            <div style={{ display: 'flex', border: '2px solid var(--ink)', borderRadius: 12, background: 'var(--paper)', overflow: 'hidden' }}>
              <input
                id="em"
                type="email"
                value={email}
                onChange={(e) => onEmailChange(e.target.value)}
                onBlur={onEmailBlur}
                onFocus={() => setMascotState(email.length ? 'watch' : 'idle')}
                autoComplete="email"
                placeholder="you@example.com"
                className="tabular-price"
                style={{ flex: 1, border: 0, background: 'transparent', padding: 12, fontSize: 17, minWidth: 0, outline: 0 }}
              />
            </div>
            <p className="small" style={{ color: isValid ? 'var(--methi)' : emailError ? 'var(--mirchi)' : 'var(--muted)', fontWeight: isValid || emailError ? 600 : 400, margin: '8px 0 12px', minHeight: 20 }}>
              {emailError ?? (isValid ? 'Looks good.' : 'We’ll email you a 6-digit code.')}
            </p>
            <button className="btn primary block" disabled={!isValid || sending} onClick={handleSendOtp}>
              {sending ? 'Sending…' : 'Get code'}
            </button>
          </>
        ) : (
          <>
            <p className="lbl">
              Enter the code sent to <span className="tabular-price">{email}</span>{' '}
              <button className="link small" onClick={() => setStep('email')}>Change</button>
            </p>
            <div style={{ margin: '6px 0 12px' }}>
              <OtpInput value={otp} onChange={setOtp} masked={!showOtp} bad={!!otpError} ok={mascotState === 'jump'} onComplete={handleVerify} />
            </div>
            {otpError && <p className="small" style={{ color: 'var(--mirchi)', fontWeight: 600 }}>{otpError}</p>}
            <div className="row" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <button className="link" onClick={() => { setShowOtp((s) => !s); setMascotState(showOtp ? 'cover' : 'peek'); setBubble(showOtp ? 'I’m not looking!' : 'Okay, one tiny peek.'); }}>
                {showOtp ? 'Hide code' : 'Show code'}
              </button>
              <span className="tabular-price" style={{ color: 'var(--muted)' }}>
                {resendIn > 0 ? `Resend in 0:${String(resendIn).padStart(2, '0')}` : (
                  <button className="link" onClick={handleResend}>Resend code</button>
                )}
              </span>
            </div>
            {devOtp && (
              <p className="small" style={{ textAlign: 'center', marginBottom: 0, marginTop: 8 }}>
                Dev code: <span className="tabular-price">{devOtp}</span>
              </p>
            )}
            <button className="btn primary block" style={{ marginTop: 12 }} disabled={verifying || otp.some((d) => !d)} onClick={() => handleVerify(otp.join(''))}>
              {verifying ? 'Verifying…' : 'Verify & continue'}
            </button>
          </>
        )}
      </div>
      <p className="small" style={{ color: 'var(--muted)', textAlign: 'center', marginTop: 14 }}>
        By continuing you agree to our Terms and Privacy Policy.
      </p>
    </div>
  );
}
