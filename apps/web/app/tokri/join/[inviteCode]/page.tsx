'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { joinSharedCart } from '../../../../lib/api/cart';
import { useAuthStore } from '../../../../lib/store/auth';

export default function JoinTokriPage() {
  const { inviteCode } = useParams<{ inviteCode: string }>();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      router.push(`/login?next=/tokri/join/${inviteCode}`);
      return;
    }
    joinSharedCart(inviteCode)
      .then((cart) => router.push(`/tokri/${cart.id}`))
      .catch((e) => setError(e.message ?? 'Could not join this Tokri'));
  }, [inviteCode, user, router]);

  return (
    <div style={{ padding: '70px 24px', textAlign: 'center' }}>
      {error ? (
        <p className="small" style={{ color: 'var(--mirchi)' }}>{error}</p>
      ) : (
        <p className="small" style={{ color: 'var(--muted)' }}>Joining the Tokri…</p>
      )}
    </div>
  );
}
