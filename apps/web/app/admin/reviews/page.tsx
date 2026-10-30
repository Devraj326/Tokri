'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminDeleteReview, adminListReviews } from '../../../lib/api/admin';

const PAGE_SIZE = 20;

export default function AdminReviewsPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(0);

  const reviewsQuery = useQuery({
    queryKey: ['admin-reviews', page],
    queryFn: () => adminListReviews({ limit: PAGE_SIZE, offset: page * PAGE_SIZE }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminDeleteReview(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-reviews'] }),
  });

  const items = reviewsQuery.data?.items ?? [];
  const total = reviewsQuery.data?.total ?? 0;

  return (
    <>
      <h2>Reviews</h2>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>User</th>
              <th>Rating</th>
              <th>Text</th>
              <th>Date</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {reviewsQuery.isLoading ? (
              <tr>
                <td colSpan={6}>Loading…</td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={6}>No reviews yet</td>
              </tr>
            ) : (
              items.map((r) => (
                <tr key={r.id}>
                  <td>{r.product.name}</td>
                  <td>{r.user.name ?? r.user.email ?? '—'}</td>
                  <td>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</td>
                  <td style={{ maxWidth: 280, whiteSpace: 'normal' }}>{r.text ?? '—'}</td>
                  <td>{new Date(r.createdAt).toLocaleDateString('en-IN')}</td>
                  <td>
                    <button
                      className="admin-btn danger"
                      style={{ padding: '4px 10px' }}
                      onClick={() => {
                        if (confirm('Delete this review?')) deleteMutation.mutate(r.id);
                      }}
                    >
                      Delete
                    </button>
                  </td>
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
    </>
  );
}
