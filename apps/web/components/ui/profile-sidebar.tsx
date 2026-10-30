'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../lib/store/auth';
import { useSessionStore } from '../../lib/store/session';
import { updateProfile, logout } from '../../lib/api/auth';
import { ApiError } from '../../lib/api/client';
import { Icon } from './icons';
import { ThemeToggle } from './theme-toggle';

export function ProfileSidebar({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const clearAuth = useAuthStore((s) => s.clear);
  const setActiveCart = useSessionStore((s) => s.setActiveCart);

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleSave() {
    if (phone.trim() && !/^[6-9]\d{9}$/.test(phone.trim())) {
      setError('Enter a valid 10-digit Indian mobile number, or leave it blank.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      setUser(await updateProfile({ name: name.trim() || undefined, phone: phone.trim() || undefined }));
      setEditing(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save your details.');
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logout().catch(() => {});
      setActiveCart(null);
      clearAuth();
      qc.clear();
      router.push('/login');
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <div className="drawerback" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="drawer" role="dialog" aria-label="Your profile">
        <div className="drawer-head">
          <span className="av" style={{ background: 'var(--haldi)', color: '#1B1A17' }}>
            {(user?.name || user?.email || 'A')[0].toUpperCase()}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <b style={{ fontSize: 17, display: 'block' }}>{user?.name || 'Add your name'}</b>
            <span className="small" style={{ color: 'var(--muted)' }}>{user?.email ?? (user?.phone ? `+91 ${user.phone}` : '')}</span>
          </div>
          <button className="iconbtn" aria-label="Close" onClick={onClose}>
            <Icon name="x" />
          </button>
        </div>

        {editing ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingBottom: 16, borderBottom: '1.5px dashed var(--dust)', marginBottom: 8 }}>
            <div>
              <label className="lbl" htmlFor="pf-name">Name</label>
              <input id="pf-name" className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
            </div>
            <div>
              <label className="lbl" htmlFor="pf-phone">Mobile number</label>
              <div style={{ display: 'flex', border: '2px solid var(--ink)', borderRadius: 12, background: 'var(--paper)', overflow: 'hidden' }}>
                <span className="tabular-price" style={{ padding: '8px 10px', borderRight: '2px solid var(--ink)', fontWeight: 600, background: 'var(--dust)' }}>+91</span>
                <input
                  id="pf-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="98765 43210"
                  className="tabular-price"
                  style={{ flex: 1, border: 0, background: 'transparent', padding: 8, fontSize: 15, minWidth: 0, outline: 0 }}
                />
              </div>
            </div>
            {error && <p className="small" style={{ color: 'var(--mirchi)', fontWeight: 600 }}>{error}</p>}
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn primary" style={{ flex: 1 }} disabled={saving} onClick={handleSave}>
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button className="btn ghost" style={{ flex: 1 }} onClick={() => { setEditing(false); setError(null); }}>Cancel</button>
            </div>
          </div>
        ) : (
          <button className="drawer-row" onClick={() => setEditing(true)}>
            <Icon name="pin" />
            <span>Edit profile</span>
          </button>
        )}

        <Link href="/orders" className="drawer-row" onClick={onClose}>
          <Icon name="clock" />
          <span>My orders</span>
        </Link>

        <div className="drawer-row" style={{ justifyContent: 'space-between' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Icon name="bolt" />
            <span>Theme</span>
          </span>
          <ThemeToggle />
        </div>

        <div style={{ flex: 1 }} />

        <button
          className="drawer-row"
          style={{ color: 'var(--mirchi)', fontWeight: 600 }}
          disabled={loggingOut}
          onClick={handleLogout}
        >
          <Icon name="x" />
          <span>{loggingOut ? 'Logging out…' : 'Log out'}</span>
        </button>
      </div>
    </div>
  );
}
