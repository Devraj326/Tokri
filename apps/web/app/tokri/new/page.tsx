'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSharedCart } from '../../../lib/api/cart';
import { useSessionStore } from '../../../lib/store/session';
import { AppBar } from '../../../components/layout/app-bar';

export default function NewTokriPage() {
  const router = useRouter();
  const storeId = useSessionStore((s) => s.storeId);
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);

  async function handleCreate() {
    if (!storeId || !name.trim()) return;
    setCreating(true);
    try {
      const cart = await createSharedCart(storeId, name.trim());
      router.push(`/tokri/${cart.id}`);
    } finally {
      setCreating(false);
    }
  }

  return (
    <>
      <AppBar title="Start a Tokri" backHref="/" />
      <div className="pad stack" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <p className="small" style={{ color: 'var(--muted)' }}>Name it so your group knows which run this is.</p>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Flat 302 Sunday run" className="field" style={{ fontSize: 18 }} />
        <button className="btn primary block" disabled={creating || !name.trim()} onClick={handleCreate}>
          {creating ? 'Creating…' : 'Create & invite'}
        </button>
      </div>
    </>
  );
}
