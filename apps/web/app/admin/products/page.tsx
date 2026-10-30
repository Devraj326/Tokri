'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  adminCreateProduct,
  adminCreateVariant,
  adminDeleteProduct,
  adminDeleteVariant,
  adminListCategories,
  adminListProducts,
  adminListStores,
  adminUpdateProduct,
  adminUpdateVariant,
  adminUpsertInventory,
  type AdminProduct,
} from '../../../lib/api/admin';

const PAGE_SIZE = 20;

export default function AdminProductsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(0);
  const [editing, setEditing] = useState<AdminProduct | 'new' | null>(null);

  const categoriesQuery = useQuery({ queryKey: ['admin-categories'], queryFn: adminListCategories });
  const productsQuery = useQuery({
    queryKey: ['admin-products', search, category, page],
    queryFn: () =>
      adminListProducts({ search: search || undefined, category: category || undefined, limit: PAGE_SIZE, offset: page * PAGE_SIZE }),
  });

  const categories = categoriesQuery.data ?? [];
  const items = productsQuery.data?.items ?? [];
  const total = productsQuery.data?.total ?? 0;

  function refetchList() {
    qc.invalidateQueries({ queryKey: ['admin-products'] });
  }

  return (
    <>
      <h2>Products</h2>
      <div className="admin-toolbar">
        <input
          className="admin-input"
          placeholder="Search products…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
        />
        <select
          className="admin-select"
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setPage(0);
          }}
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
        <button className="admin-btn" onClick={() => setEditing('new')}>
          + New product
        </button>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Category</th>
              <th>Subcategory</th>
              <th>Variants</th>
              <th>Price range</th>
            </tr>
          </thead>
          <tbody>
            {productsQuery.isLoading ? (
              <tr>
                <td colSpan={5}>Loading…</td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={5}>No products found</td>
              </tr>
            ) : (
              items.map((p) => {
                const prices = p.variants.map((v) => v.price);
                return (
                  <tr key={p.id} className="clickable" onClick={() => setEditing(p)}>
                    <td>{p.name}</td>
                    <td>{p.category.name}</td>
                    <td>{p.subcategory ?? '—'}</td>
                    <td>{p.variants.length}</td>
                    <td>{prices.length ? `₹${Math.min(...prices)}–₹${Math.max(...prices)}` : '—'}</td>
                  </tr>
                );
              })
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
        <ProductDrawer
          product={editing === 'new' ? null : editing}
          categories={categories}
          onClose={() => setEditing(null)}
          onSaved={refetchList}
        />
      )}
    </>
  );
}

function ProductDrawer({
  product,
  categories,
  onClose,
  onSaved,
}: {
  product: AdminProduct | null;
  categories: { id: string; name: string; slug: string }[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: product?.name ?? '',
    hindiName: product?.hindiName ?? '',
    categoryId: product?.category.id ?? categories[0]?.id ?? '',
    subcategory: product?.subcategory ?? '',
    brand: product?.brand ?? '',
    unit: product?.unit ?? '',
  });
  const [error, setError] = useState('');
  const [newVariant, setNewVariant] = useState({ size: '', mrp: '', price: '' });

  const storesQuery = useQuery({ queryKey: ['admin-stores'], queryFn: adminListStores });
  const stores = storesQuery.data ?? [];

  const saveMutation = useMutation({
    mutationFn: () => {
      const data = {
        name: form.name,
        hindiName: form.hindiName || undefined,
        categoryId: form.categoryId,
        subcategory: form.subcategory || undefined,
        brand: form.brand || undefined,
        unit: form.unit,
      };
      return product ? adminUpdateProduct(product.id, data) : adminCreateProduct(data as any);
    },
    onSuccess: () => {
      onSaved();
      qc.invalidateQueries({ queryKey: ['admin-products'] });
      onClose();
    },
    onError: (err: any) => setError(err?.message ?? 'Failed to save'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => adminDeleteProduct(product!.id),
    onSuccess: () => {
      onSaved();
      onClose();
    },
    onError: (err: any) => setError(err?.message ?? 'Failed to delete'),
  });

  const addVariantMutation = useMutation({
    mutationFn: () =>
      adminCreateVariant(product!.id, {
        size: newVariant.size,
        mrp: Number(newVariant.mrp),
        price: Number(newVariant.price),
      }),
    onSuccess: () => {
      setNewVariant({ size: '', mrp: '', price: '' });
      qc.invalidateQueries({ queryKey: ['admin-products'] });
      onSaved();
    },
    onError: (err: any) => setError(err?.message ?? 'Failed to add variant'),
  });

  const updateVariantMutation = useMutation({
    mutationFn: (args: { id: string; data: { size?: string; mrp?: number; price?: number } }) =>
      adminUpdateVariant(args.id, args.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-products'] });
      onSaved();
    },
  });

  const deleteVariantMutation = useMutation({
    mutationFn: (id: string) => adminDeleteVariant(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-products'] });
      onSaved();
    },
  });

  const inventoryMutation = useMutation({
    mutationFn: (args: { variantId: string; storeId: string; qty: number }) =>
      adminUpsertInventory(args.variantId, args.storeId, args.qty),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-products'] });
      onSaved();
    },
  });

  return (
    <div className="admin-drawer-back" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="admin-drawer">
        <h3>{product ? 'Edit product' : 'New product'}</h3>
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
          <label>Category</label>
          <select
            className="admin-select"
            value={form.categoryId}
            onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="admin-field">
          <label>Subcategory</label>
          <input
            className="admin-input"
            value={form.subcategory}
            onChange={(e) => setForm((f) => ({ ...f, subcategory: e.target.value }))}
          />
        </div>
        <div className="admin-field">
          <label>Brand</label>
          <input className="admin-input" value={form.brand} onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))} />
        </div>
        <div className="admin-field">
          <label>Unit</label>
          <input className="admin-input" value={form.unit} onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))} />
        </div>

        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          <button className="admin-btn" disabled={saveMutation.isPending} onClick={() => saveMutation.mutate()}>
            Save
          </button>
          {product && (
            <button
              className="admin-btn danger"
              disabled={deleteMutation.isPending}
              onClick={() => {
                if (confirm(`Delete product "${product.name}"?`)) deleteMutation.mutate();
              }}
            >
              Delete
            </button>
          )}
          <button className="admin-btn ghost" onClick={onClose}>
            Close
          </button>
        </div>

        {product && (
          <>
            <h3 style={{ fontSize: 16 }}>Variants</h3>
            {product.variants.map((v) => (
              <div key={v.id} style={{ border: '1.5px dashed var(--dust)', borderRadius: 10, padding: 10, marginBottom: 10 }}>
                <div className="admin-variant-row">
                  <input
                    className="admin-input"
                    defaultValue={v.size}
                    onBlur={(e) => e.target.value !== v.size && updateVariantMutation.mutate({ id: v.id, data: { size: e.target.value } })}
                  />
                  <input
                    className="admin-input"
                    type="number"
                    defaultValue={v.mrp}
                    onBlur={(e) =>
                      Number(e.target.value) !== v.mrp && updateVariantMutation.mutate({ id: v.id, data: { mrp: Number(e.target.value) } })
                    }
                  />
                  <input
                    className="admin-input"
                    type="number"
                    defaultValue={v.price}
                    onBlur={(e) =>
                      Number(e.target.value) !== v.price &&
                      updateVariantMutation.mutate({ id: v.id, data: { price: Number(e.target.value) } })
                    }
                  />
                  <button
                    className="admin-btn danger"
                    style={{ padding: '6px 10px' }}
                    onClick={() => {
                      if (confirm('Delete this variant?')) deleteVariantMutation.mutate(v.id);
                    }}
                  >
                    ✕
                  </button>
                </div>
                {stores.map((s) => {
                  const inv = v.inventory.find((i) => i.storeId === s.id);
                  return (
                    <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginTop: 4 }}>
                      <span style={{ color: 'var(--muted)', flex: 1 }}>{s.name} stock</span>
                      <input
                        className="admin-input"
                        type="number"
                        style={{ width: 90 }}
                        defaultValue={inv?.qtyAvailable ?? 0}
                        onBlur={(e) => {
                          const qty = Number(e.target.value);
                          if (qty !== (inv?.qtyAvailable ?? 0)) {
                            inventoryMutation.mutate({ variantId: v.id, storeId: s.id, qty });
                          }
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            ))}

            <div className="admin-variant-row">
              <input
                className="admin-input"
                placeholder="Size (e.g. 1 kg)"
                value={newVariant.size}
                onChange={(e) => setNewVariant((f) => ({ ...f, size: e.target.value }))}
              />
              <input
                className="admin-input"
                type="number"
                placeholder="MRP"
                value={newVariant.mrp}
                onChange={(e) => setNewVariant((f) => ({ ...f, mrp: e.target.value }))}
              />
              <input
                className="admin-input"
                type="number"
                placeholder="Price"
                value={newVariant.price}
                onChange={(e) => setNewVariant((f) => ({ ...f, price: e.target.value }))}
              />
              <button
                className="admin-btn"
                style={{ padding: '6px 10px' }}
                disabled={!newVariant.size || !newVariant.mrp || !newVariant.price || addVariantMutation.isPending}
                onClick={() => addVariantMutation.mutate()}
              >
                + Add
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
