'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  adminCreateCoupon,
  adminDeleteCoupon,
  adminListCoupons,
  adminUpdateCoupon,
  type AdminCoupon,
} from '../../../lib/api/admin';

const EMPTY_FORM = {
  code: '',
  description: '',
  discountType: 'flat' as 'flat' | 'percent',
  value: '',
  minOrderValue: '',
  maxDiscount: '',
  expiresAt: '',
  usageLimit: '',
  isActive: true,
};

export default function AdminCouponsPage() {
  const qc = useQueryClient();
  const couponsQuery = useQuery({ queryKey: ['admin-coupons'], queryFn: adminListCoupons });
  const [editing, setEditing] = useState<AdminCoupon | 'new' | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');

  const coupons = couponsQuery.data ?? [];

  function openEdit(c: AdminCoupon | 'new') {
    setEditing(c);
    setError('');
    if (c === 'new') {
      setForm(EMPTY_FORM);
    } else {
      setForm({
        code: c.code,
        description: c.description ?? '',
        discountType: c.discountType,
        value: String(c.value),
        minOrderValue: c.minOrderValue != null ? String(c.minOrderValue) : '',
        maxDiscount: c.maxDiscount != null ? String(c.maxDiscount) : '',
        expiresAt: c.expiresAt ? c.expiresAt.slice(0, 10) : '',
        usageLimit: c.usageLimit != null ? String(c.usageLimit) : '',
        isActive: c.isActive,
      });
    }
  }

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        description: form.description || undefined,
        discountType: form.discountType,
        value: Number(form.value),
        minOrderValue: form.minOrderValue ? Number(form.minOrderValue) : undefined,
        maxDiscount: form.maxDiscount ? Number(form.maxDiscount) : undefined,
        expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : undefined,
        usageLimit: form.usageLimit ? Number(form.usageLimit) : undefined,
      };
      if (editing === 'new') {
        return adminCreateCoupon({ ...payload, code: form.code });
      }
      return adminUpdateCoupon((editing as AdminCoupon).id, { ...payload, isActive: form.isActive });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-coupons'] });
      setEditing(null);
    },
    onError: (err: any) => setError(err?.message ?? 'Failed to save'),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: (c: AdminCoupon) => adminUpdateCoupon(c.id, { isActive: !c.isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-coupons'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminDeleteCoupon(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-coupons'] });
      setEditing(null);
    },
    onError: (err: any) => setError(err?.message ?? 'Failed to delete'),
  });

  return (
    <>
      <h2>Coupons</h2>
      <div className="admin-toolbar">
        <button className="admin-btn" onClick={() => openEdit('new')}>
          + New coupon
        </button>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Discount</th>
              <th>Min order</th>
              <th>Usage</th>
              <th>Expires</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {couponsQuery.isLoading ? (
              <tr>
                <td colSpan={6}>Loading…</td>
              </tr>
            ) : coupons.length === 0 ? (
              <tr>
                <td colSpan={6}>No coupons yet</td>
              </tr>
            ) : (
              coupons.map((c) => (
                <tr key={c.id} className="clickable" onClick={() => openEdit(c)}>
                  <td>{c.code}</td>
                  <td>{c.discountType === 'flat' ? `₹${c.value} off` : `${c.value}% off${c.maxDiscount ? ` (max ₹${c.maxDiscount})` : ''}`}</td>
                  <td>{c.minOrderValue ? `₹${c.minOrderValue}` : '—'}</td>
                  <td>
                    {c.usedCount}
                    {c.usageLimit ? ` / ${c.usageLimit}` : ''}
                  </td>
                  <td>{c.expiresAt ? new Date(c.expiresAt).toLocaleDateString('en-IN') : 'Never'}</td>
                  <td>
                    <span
                      className="admin-badge"
                      style={{ cursor: 'pointer' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleActiveMutation.mutate(c);
                      }}
                    >
                      {c.isActive ? 'Active' : 'Inactive'}
                    </span>
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
            <h3>{editing === 'new' ? 'New coupon' : 'Edit coupon'}</h3>
            {error && <p className="admin-error">{error}</p>}

            <div className="admin-field">
              <label>Code</label>
              <input
                className="admin-input"
                value={form.code}
                disabled={editing !== 'new'}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                placeholder="FLAT50"
              />
            </div>
            <div className="admin-field">
              <label>Description</label>
              <input
                className="admin-input"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Flat ₹50 off above ₹499"
              />
            </div>
            <div className="admin-field">
              <label>Discount type</label>
              <select
                className="admin-select"
                value={form.discountType}
                onChange={(e) => setForm((f) => ({ ...f, discountType: e.target.value as 'flat' | 'percent' }))}
              >
                <option value="flat">Flat amount (₹)</option>
                <option value="percent">Percentage (%)</option>
              </select>
            </div>
            <div className="admin-field">
              <label>Value</label>
              <input
                className="admin-input"
                type="number"
                value={form.value}
                onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
              />
            </div>
            {form.discountType === 'percent' && (
              <div className="admin-field">
                <label>Max discount (₹, optional)</label>
                <input
                  className="admin-input"
                  type="number"
                  value={form.maxDiscount}
                  onChange={(e) => setForm((f) => ({ ...f, maxDiscount: e.target.value }))}
                />
              </div>
            )}
            <div className="admin-field">
              <label>Minimum order value (₹, optional)</label>
              <input
                className="admin-input"
                type="number"
                value={form.minOrderValue}
                onChange={(e) => setForm((f) => ({ ...f, minOrderValue: e.target.value }))}
              />
            </div>
            <div className="admin-field">
              <label>Usage limit (optional)</label>
              <input
                className="admin-input"
                type="number"
                value={form.usageLimit}
                onChange={(e) => setForm((f) => ({ ...f, usageLimit: e.target.value }))}
              />
            </div>
            <div className="admin-field">
              <label>Expires on (optional)</label>
              <input
                className="admin-input"
                type="date"
                value={form.expiresAt}
                onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))}
              />
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
              <button
                className="admin-btn"
                disabled={saveMutation.isPending || !form.code || !form.value}
                onClick={() => saveMutation.mutate()}
              >
                Save
              </button>
              {editing !== 'new' && (
                <button
                  className="admin-btn danger"
                  disabled={deleteMutation.isPending}
                  onClick={() => {
                    if (confirm(`Delete coupon "${(editing as AdminCoupon).code}"?`)) {
                      deleteMutation.mutate((editing as AdminCoupon).id);
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
