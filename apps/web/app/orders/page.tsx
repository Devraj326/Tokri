'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { listMyOrders } from '../../lib/api/orders';
import { AppBar } from '../../components/layout/app-bar';

const STATUS_LABEL: Record<string, string> = {
  confirmed: 'Confirmed',
  packing: 'Packing',
  out_for_delivery: 'On the way',
  delivered: 'Delivered',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function OrdersPage() {
  const ordersQuery = useQuery({ queryKey: ['my-orders'], queryFn: listMyOrders });
  const orders = ordersQuery.data ?? [];

  return (
    <>
      <AppBar title="My orders" backHref="/" />

      {ordersQuery.isLoading ? (
        <p className="small pad" style={{ padding: 16, color: 'var(--muted)' }}>Loading…</p>
      ) : orders.length === 0 ? (
        <div style={{ padding: '50px 26px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
          <h2 className="font-display" style={{ fontSize: 26 }}>No orders yet</h2>
          <p className="small" style={{ color: 'var(--muted)' }}>Once you place an order, it'll show up here.</p>
          <Link href="/" className="btn primary">Start shopping</Link>
        </div>
      ) : (
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {orders.map((order) => {
            const names = order.cart.items.map((i) => i.variant.product.name);
            const preview = names.slice(0, 2).join(', ') + (names.length > 2 ? ` & ${names.length - 2} more` : '');
            return (
              <Link
                key={order.id}
                href={`/orders/${order.id}`}
                className="card"
                style={{ display: 'block', padding: 14, border: '2px solid var(--ink)', borderRadius: 16 }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span className="small" style={{ color: 'var(--muted)' }}>{formatDate(order.createdAt)}</span>
                  <span
                    className="small"
                    style={{
                      fontWeight: 600,
                      color: order.status === 'delivered' ? 'var(--methi)' : 'var(--ink)',
                    }}
                  >
                    {STATUS_LABEL[order.status] ?? order.status}
                  </span>
                </div>
                <p style={{ margin: '6px 0', fontSize: 14 }}>{preview || `${names.length} items`}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span className="small" style={{ color: 'var(--muted)' }}>{names.length} item{names.length !== 1 ? 's' : ''}</span>
                  <span className="price">₹{order.total}</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
