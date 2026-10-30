'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  adminDeleteUser,
  adminListUsers,
  adminUpdateUser,
  type AdminUser,
} from '../../../lib/api/admin';

const PAGE_SIZE = 20;

export default function AdminUsersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '' });
  const [error, setError] = useState('');

  const usersQuery = useQuery({
    queryKey: ['admin-users', search, page],
    queryFn: () => adminListUsers({ search: search || undefined, limit: PAGE_SIZE, offset: page * PAGE_SIZE }),
  });

  const updateMutation = useMutation({
    mutationFn: (data: { name?: string; email?: string; phone?: string }) => adminUpdateUser(editing!.id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      setEditing(null);
    },
    onError: (err: any) => setError(err?.message ?? 'Failed to update'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminDeleteUser(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      setEditing(null);
    },
    onError: (err: any) => setError(err?.message ?? 'Failed to delete'),
  });

  function openEdit(u: AdminUser) {
    setEditing(u);
    setForm({ name: u.name ?? '', email: u.email ?? '', phone: u.phone ?? '' });
    setError('');
  }

  const total = usersQuery.data?.total ?? 0;
  const items = usersQuery.data?.items ?? [];

  return (
    <>
      <h2>Users</h2>
      <div className="admin-toolbar">
        <input
          className="admin-input"
          placeholder="Search name, email, phone…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
        />
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Orders</th>
              <th>Joined</th>
            </tr>
          </thead>
          <tbody>
            {usersQuery.isLoading ? (
              <tr>
                <td colSpan={5}>Loading…</td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={5}>No users found</td>
              </tr>
            ) : (
              items.map((u) => (
                <tr key={u.id} className="clickable" onClick={() => openEdit(u)}>
                  <td>{u.name ?? '—'}</td>
                  <td>{u.email ?? '—'}</td>
                  <td>{u.phone ?? '—'}</td>
                  <td>{u._count.orders}</td>
                  <td>{new Date(u.createdAt).toLocaleDateString('en-IN')}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="admin-pagination">
        <span>
          {items.length ? page * PAGE_SIZE + 1 : 0}–{page * PAGE_SIZE + items.length} of {total}
        </span>
        <button className="admin-btn ghost" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
          Prev
        </button>
        <button
          className="admin-btn ghost"
          disabled={(page + 1) * PAGE_SIZE >= total}
          onClick={() => setPage((p) => p + 1)}
        >
          Next
        </button>
      </div>

      {editing && (
        <div className="admin-drawer-back" onClick={(e) => e.target === e.currentTarget && setEditing(null)}>
          <div className="admin-drawer">
            <h3>Edit user</h3>
            {error && <p className="admin-error">{error}</p>}
            <div className="admin-field">
              <label>Name</label>
              <input
                className="admin-input"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="admin-field">
              <label>Email</label>
              <input
                className="admin-input"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div className="admin-field">
              <label>Phone</label>
              <input
                className="admin-input"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
              <button
                className="admin-btn"
                disabled={updateMutation.isPending}
                onClick={() =>
                  updateMutation.mutate({
                    name: form.name || undefined,
                    email: form.email || undefined,
                    phone: form.phone || undefined,
                  })
                }
              >
                Save
              </button>
              <button
                className="admin-btn danger"
                disabled={deleteMutation.isPending}
                onClick={() => {
                  if (confirm(`Delete ${editing.name ?? editing.email ?? 'this user'}?`)) {
                    deleteMutation.mutate(editing.id);
                  }
                }}
              >
                Delete
              </button>
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
