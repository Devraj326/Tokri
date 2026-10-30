'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { listActiveCoupons } from '../../lib/api/coupons';
import { AppBar } from '../../components/layout/app-bar';

export default function CouponsPage() {
  const couponsQuery = useQuery({ queryKey: ['active-coupons'], queryFn: listActiveCoupons });
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const coupons = couponsQuery.data ?? [];

  async function copy(code: string) {
    try {
      await navigator.clipboard?.writeText(code);
    } catch {
      // clipboard unavailable, still show copied state
    }
    setCopiedCode(code);
    setTimeout(() => setCopiedCode((c) => (c === code ? null : c)), 1600);
  }

  return (
    <>
      <AppBar title="Offers & coupons" backHref="/" />

      {couponsQuery.isLoading ? (
        <p className="small pad" style={{ padding: 16, color: 'var(--muted)' }}>Loading…</p>
      ) : coupons.length === 0 ? (
        <div style={{ padding: '50px 26px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          <h2 className="font-display" style={{ fontSize: 24 }}>No offers right now</h2>
          <p className="small" style={{ color: 'var(--muted)' }}>Check back soon for new coupons.</p>
        </div>
      ) : (
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {coupons.map((c) => (
            <button
              key={c.code}
              onClick={() => copy(c.code)}
              className="card"
              style={{
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: 14,
                border: '2px dashed var(--ink)',
                borderRadius: 16,
                background: 'var(--card)',
              }}
            >
              <div
                style={{
                  flex: 'none',
                  width: 56,
                  height: 56,
                  borderRadius: 12,
                  background: 'var(--haldi)',
                  color: 'var(--on-accent)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: 13,
                  border: '2px solid var(--ink)',
                }}
              >
                <span>{c.discountType === 'flat' ? `₹${c.value}` : `${c.value}%`}</span>
                <span style={{ fontSize: 10 }}>OFF</span>
              </div>
              <div style={{ flex: 1 }}>
                <b style={{ display: 'block' }}>
                  {c.description ?? (c.discountType === 'flat' ? `Flat ₹${c.value} off` : `${c.value}% off`)}
                </b>
                <span className="small" style={{ color: 'var(--muted)' }}>
                  {c.minOrderValue ? `On orders above ₹${c.minOrderValue}` : 'No minimum order'}
                  {c.maxDiscount ? ` · up to ₹${c.maxDiscount}` : ''}
                  {c.expiresAt ? ` · valid till ${new Date(c.expiresAt).toLocaleDateString('en-IN')}` : ''}
                </span>
              </div>
              <code
                style={{
                  flex: 'none',
                  padding: '6px 10px',
                  borderRadius: 8,
                  border: '2px solid var(--ink)',
                  fontWeight: 700,
                  background: copiedCode === c.code ? 'var(--methi)' : 'var(--paper)',
                  color: copiedCode === c.code ? '#fff' : 'var(--ink)',
                }}
              >
                {copiedCode === c.code ? 'Copied' : c.code}
              </code>
            </button>
          ))}
        </div>
      )}
    </>
  );
}
