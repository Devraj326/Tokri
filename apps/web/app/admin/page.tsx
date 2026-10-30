'use client';

import { useQuery } from '@tanstack/react-query';
import { adminStats } from '../../lib/api/admin';

export default function AdminOverviewPage() {
  const statsQuery = useQuery({ queryKey: ['admin-stats'], queryFn: adminStats });
  const s = statsQuery.data;

  return (
    <>
      <h2>Overview</h2>
      {statsQuery.isLoading ? (
        <p>Loading…</p>
      ) : s ? (
        <>
          <div className="admin-stats-grid">
            <div className="admin-stat-card">
              <b>{s.users}</b>
              <span>Users</span>
            </div>
            <div className="admin-stat-card">
              <b>{s.products}</b>
              <span>Products</span>
            </div>
            <div className="admin-stat-card">
              <b>{s.categories}</b>
              <span>Categories</span>
            </div>
            <div className="admin-stat-card">
              <b>{s.stores}</b>
              <span>Stores</span>
            </div>
            <div className="admin-stat-card">
              <b>{s.orders}</b>
              <span>Orders</span>
            </div>
            <div className="admin-stat-card">
              <b>₹{s.revenueTotal.toLocaleString('en-IN')}</b>
              <span>Revenue</span>
            </div>
            <div className="admin-stat-card">
              <b>{s.coupons}</b>
              <span>Coupons</span>
            </div>
            <div className="admin-stat-card">
              <b>{s.reviews}</b>
              <span>Reviews{s.avgRating > 0 ? ` (★${s.avgRating})` : ''}</span>
            </div>
          </div>

          <h2 style={{ fontSize: 18 }}>Orders by status</h2>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Count</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(s.ordersByStatus).map(([status, count]) => (
                  <tr key={status}>
                    <td>{status}</td>
                    <td>{count}</td>
                  </tr>
                ))}
                {Object.keys(s.ordersByStatus).length === 0 && (
                  <tr>
                    <td colSpan={2}>No orders yet</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </>
  );
}
