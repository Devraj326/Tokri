'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  adminCreateCategory,
  adminDeleteCategory,
  adminListCategories,
  adminUpdateCategory,
  type AdminCategory,
} from '../../../lib/api/admin';

export default function AdminCategoriesPage() {
  const qc = useQueryClient();
  const categoriesQuery = useQuery({ queryKey: ['admin-categories'], queryFn: adminListCategories });
  const [editing, setEditing] = useState<AdminCategory | 'new' | null>(null);
  const [form, setForm] = useState({ name: '', hindiName: '', slug: '', parentId: '' });
  const [error, setError] = useState('');

  const categories = categoriesQuery.data ?? [];

  function openEdit(c: AdminCategory | 'new') {
    setEditing(c);
    setError('');
    if (c === 'new') setForm({ name: '', hindiName: '', slug: '', parentId: '' });
    else setForm({ name: c.name, hindiName: c.hindiName ?? '', slug: c.slug, parentId: c.parentId ?? '' });
  }

  const saveMutation = useMutation({
    mutationFn: () => {
      const data = {
        name: form.name,
        hindiName: form.hindiName || undefined,
        slug: form.slug,
        parentId: form.parentId || undefined,
      };
      return editing === 'new' ? adminCreateCategory(data) : adminUpdateCategory((editing as AdminCategory).id, data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-categories'] });
      setEditing(null);
    },
    onError: (err: any) => setError(err?.message ?? 'Failed to save'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminDeleteCategory(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-categories'] });
      setEditing(null);
    },
    onError: (err: any) => setError(err?.message ?? 'Failed to delete'),
  });

  return (
    <>
      <h2>Categories</h2>
      <div className="admin-toolbar">
        <button className="admin-btn" onClick={() => openEdit('new')}>
          + New category
        </button>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Slug</th>
              <th>Parent</th>
              <th>Products</th>
            </tr>
          </thead>
          <tbody>
            {categoriesQuery.isLoading ? (
              <tr>
                <td colSpan={4}>Loading…</td>
              </tr>
            ) : (
              categories.map((c) => (
                <tr key={c.id} className="clickable" onClick={() => openEdit(c)}>
                  <td>{c.name}</td>
                  <td>{c.slug}</td>
                  <td>{c.parent?.name ?? '—'}</td>
                  <td>{c._count.products}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="admin-drawer-back" onClick={(e) => e.target === e.currentTarget && setEditing(null)}>
          <div className="admin-drawer">
            <h3>{editing === 'new' ? 'New category' : 'Edit category'}</h3>
            {error && <p className="admin-error">{error}</p>}
            <div className="admin-field">
              <label>Name</label>
              <input className="admin-input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="admin-field">
              <label>Hindi name</label>
              <input
                className="admin-input"
                value={form.hindiName}
                onChange={(e) => setForm((f) => ({ ...f, hindiName: e.target.value }))}
              />
            </div>
            <div className="admin-field">
              <label>Slug</label>
              <input className="admin-input" value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} />
            </div>
            <div className="admin-field">
              <label>Parent category</label>
              <select
                className="admin-select"
                value={form.parentId}
                onChange={(e) => setForm((f) => ({ ...f, parentId: e.target.value }))}
              >
                <option value="">None</option>
                {categories
                  .filter((c) => editing === 'new' || c.id !== (editing as AdminCategory).id)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
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
                    if (confirm(`Delete category "${(editing as AdminCategory).name}"?`)) {
                      deleteMutation.mutate((editing as AdminCategory).id);
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
