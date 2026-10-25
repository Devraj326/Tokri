'use client';

export function ChaiMeter({ subtotal, threshold }: { subtotal: number; threshold: number }) {
  const pct = Math.min(1, subtotal / threshold);
  const full = subtotal >= threshold;
  const liquidY = (1 - pct) * 46;

  return (
    <section className="card" style={{ padding: 14, display: 'flex', gap: 14, alignItems: 'center' }}>
      <svg viewBox="0 0 46 60" aria-hidden style={{ width: 46, flex: 'none', overflow: 'visible' }}>
        <defs>
          <clipPath id="glass">
            <path d="M6 12h34l-5 44H11z" />
          </clipPath>
        </defs>
        <g clipPath="url(#glass)">
          <g style={{ transform: `translateY(${liquidY}px)`, transition: 'transform .9s cubic-bezier(.3,1.3,.5,1)' }}>
            <path
              d="M-46 14q5.75-4 11.5 0t11.5 0t11.5 0t11.5 0t11.5 0t11.5 0t11.5 0t11.5 0V80H-46z"
              fill="#C98A4B"
            />
          </g>
        </g>
        <path d="M6 12h34l-5 44H11z" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinejoin="round" />
        {full && (
          <g fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" opacity={0.65}>
            <path d="M18 8c-3-3 3-5 0-8" />
            <path d="M28 8c-3-3 3-5 0-8" />
          </g>
        )}
      </svg>
      <div>
        <p style={{ fontWeight: 600 }}>
          {full ? 'Free delivery unlocked' : `Add ₹${Math.round(threshold - subtotal)} more for free delivery`}
        </p>
        <p className="small" style={{ color: 'var(--muted)' }}>
          {full ? 'The chai glass is full.' : 'Free delivery on orders above ₹199.'}
        </p>
      </div>
    </section>
  );
}
