'use client';

import { useRef } from 'react';
import { clsx } from 'clsx';

interface OtpInputProps {
  value: string[];
  onChange: (next: string[]) => void;
  masked?: boolean;
  bad?: boolean;
  ok?: boolean;
  onComplete?: (code: string) => void;
}

export function OtpInput({ value, onChange, masked = false, bad = false, ok = false, onComplete }: OtpInputProps) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  function setDigit(index: number, digit: string) {
    const next = [...value];
    next[index] = digit;
    onChange(next);
    if (next.every((d) => d.length === 1)) onComplete?.(next.join(''));
  }

  function handleChange(index: number, raw: string) {
    const digit = raw.replace(/\D/g, '').slice(-1);
    setDigit(index, digit);
    if (digit && index < 5) refs.current[index + 1]?.focus();
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !value[index] && index > 0) {
      refs.current[index - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    e.preventDefault();
    const next = pasted.split('');
    while (next.length < 6) next.push('');
    onChange(next);
    if (pasted.length === 6) onComplete?.(pasted);
    refs.current[Math.min(pasted.length, 5)]?.focus();
  }

  return (
    <div className={clsx('otp', bad && 'bad')} role="group" aria-label="One-time password">
      {value.map((digit, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          aria-label={`OTP digit ${i + 1}`}
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          maxLength={1}
          value={masked && digit ? '•' : digit}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          className={clsx(digit && 'filled', ok && 'ok')}
        />
      ))}
    </div>
  );
}
