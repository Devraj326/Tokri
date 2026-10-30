'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  adminCreateStore,
  adminDeleteStore,
  adminListStores,
  adminUpdateStore,
  type AdminStore,
} from '../../../lib/api/admin';

export default function AdminStoresPage() {
  const qc = useQueryClient();
  const storesQuery = useQuery({ queryKey: ['admin-stores'], queryFn: adminListStores });
  const [editing, setEditing] = useState<AdminStore | 'new' | null>(null);
  const [form, setForm] = useState({ name: '', lat: '', lng: '', radiusKm: '5', isOpen: true });
  const [error, setError] = useState('');

  const stores = storesQuery.data ?? [];

  function openEdit(s: AdminStore | 'new') {
    setEditing(s);
    setError('');
    if (s === 'new') setForm({ name: '', lat: '', lng: '', radiusKm: '5', isOpen: true });
    else setForm({ name: s.name, lat: String(s.lat), lng: String(s.lng), radiusKm: String(s.radiusKm), isOpen: s.isOpen });
  }

  const saveMutation = useMutation({
    mutationFn: () => {
      const data = {
        name: form.name,
        lat: Number(form.lat),
        lng: Number(form.lng),
        radiusKm: Number(form.radiusKm),
        isOpen: form.isOpen,
      };
      return editing === 'new' ? adminCreateStore(data) : adminUpdateStore((editing as AdminStore).id, data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-stores'] });
      setEditing(null);
    },
    onError: (err: any) => setError(err?.message ?? 'Failed to save'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminDeleteStore(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-stores'] });
      setEditing(null);
    },
    onError: (err: any) => setError(err?.message ?? 'Failed to delete'),
  });

  return (
    <>
      <h2>Stores</h2>
      <div className="admin-toolbar">
        <button className="admin-btn" onClick={() => openEdit('new')}>
          + New store
        </button>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Lat</th>
              <th>Lng</th>
              <th>Radius (km)</th>
              <th>Open</th>
            </tr>
          </thead>
          <tbody>
            {storesQuery.isLoading ? (
              <tr>
                <td colSpan={5}>Loading…</td>
              </tr>
            ) : (
              stores.map((s) => (
                <tr key={s.id} className="clickable" onClick={() => openEdit(s)}>
                  <td>{s.name}</td>
                  <td>{s.lat}</td>
                  <td>{s.lng}</td>
                  <td>{s.radiusKm}</td>
                  <td>
                    <span className="admin-badge">{s.isOpen ? 'Open' : 'Closed'}</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="admin-drawer-back" onClick={(e) => e.target === e.currentTarget && setEditing(null)}>
          <div className="admin-drawer">
            <h3>{editing === 'new' ? 'New store' : 'Edit store'}</h3>
            {error && <p className="admin-error">{error}</p>}
            <div className="admin-field">
              <label>Name</label>
              <input className="admin-input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="admin-field">
              <label>Latitude</label>
              <input className="admin-input" value={form.lat} onChange={(e) => setForm((f) => ({ ...f, lat: e.target.value }))} />
            </div>
            <div className="admin-field">
              <label>Longitude</label>
              <input className="admin-input" value={form.lng} onChange={(e) => setForm((f) => ({ ...f, lng: e.target.value }))} />
            </div>
            <div className="admin-field">
              <label>Radius (km)</label>
              <input
                className="admin-input"
                value={form.radiusKm}
                onChange={(e) => setForm((f) => ({ ...f, radiusKm: e.target.value }))}
              />
            </div>
            <div className="admin-field">
              <label>
                <input
                  type="checkbox"
                  checked={form.isOpen}
                  onChange={(e) => setForm((f) => ({ ...f, isOpen: e.target.checked }))}
                  style={{ marginRight: 8 }}
                />
                Open for orders
              </label>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
              <button className="admin-btn" disabled={saveMutation.isPending} onClick={() => saveMutation.mutate()}>
                Save
              </button>
              {editing !== 'new' && (
                <button
                  className="admin-btn danger"
                  disabled={deleteMutation.isPending}
                  onClick={() => {
                    if (confirm(`Delete store "${(editing as AdminStore).name}"?`)) {
                      deleteMutation.mutate((editing as AdminStore).id);
                    }
                  }}
                >
                  Delete
                </button>
              )}
              <button className="admin-btn ghost" onClick={() => setEditing(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
