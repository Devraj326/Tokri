'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminListOrders, adminUpdateOrderStatus, type AdminOrder } from '../../../lib/api/admin';

const PAGE_SIZE = 20;
const STATUSES = ['confirmed', 'packing', 'out_for_delivery', 'delivered'];

export default function AdminOrdersPage() {
  const qc = useQueryClient();
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(0);
  const [editing, setEditing] = useState<AdminOrder | null>(null);

  const ordersQuery = useQuery({
    queryKey: ['admin-orders', status, page],
    queryFn: () => adminListOrders({ status: status || undefined, limit: PAGE_SIZE, offset: page * PAGE_SIZE }),
  });

  const statusMutation = useMutation({
    mutationFn: (newStatus: string) => adminUpdateOrderStatus(editing!.id, newStatus),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-orders'] });
      setEditing(null);
    },
  });

  const items = ordersQuery.data?.items ?? [];
  const total = ordersQuery.data?.total ?? 0;

  return (
    <>
      <h2>Orders</h2>
      <div className="admin-toolbar">
        <select
          className="admin-select"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(0);
          }}
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Store</th>
              <th>Total</th>
              <th>Status</th>
              <th>Placed</th>
            </tr>
          </thead>
          <tbody>
            {ordersQuery.isLoading ? (
              <tr>
                <td colSpan={5}>Loading…</td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={5}>No orders found</td>
              </tr>
            ) : (
              items.map((o) => (
                <tr key={o.id} className="clickable" onClick={() => setEditing(o)}>
                  <td>{o.user.name ?? o.user.email ?? '—'}</td>
                  <td>{o.store.name}</td>
                  <td>₹{o.total}</td>
                  <td>
                    <span className="admin-badge">{o.status}</span>
                  </td>
                  <td>{new Date(o.createdAt).toLocaleString('en-IN')}</td>
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
            <h3>Order #{editing.id.slice(0, 8)}</h3>
            <p>
              <b>{editing.user.name ?? editing.user.email}</b> · {editing.store.name} · ₹{editing.total}
            </p>
            <div className="admin-field">
              <label>Status</label>
              <select
                className="admin-select"
                value={editing.status}
                onChange={(e) => statusMutation.mutate(e.target.value)}
                disabled={statusMutation.isPending}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            {editing.payments.length > 0 && (
              <div className="admin-field">
                <label>Payments</label>
                {editing.payments.map((p) => (
                  <p key={p.id} style={{ margin: 0, fontSize: 13 }}>
                    ₹{p.amount} — {p.status}
                  </p>
                ))}
              </div>
            )}
            <button className="admin-btn ghost" onClick={() => setEditing(null)} style={{ marginTop: 10 }}>
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
