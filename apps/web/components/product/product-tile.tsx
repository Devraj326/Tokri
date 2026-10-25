'use client';

import Link from 'next/link';
import { clsx } from 'clsx';
import type { ProductDto } from '../../lib/api/catalog';
import { QuantityStepper } from '../ui/quantity-stepper';
import { useActiveCart } from '../../lib/hooks/use-active-cart';
import { ProductArt, artKeyFor } from '../ui/product-art';
import { unitPrice } from '../../lib/category-meta';

export function ProductTile({ product }: { product: ProductDto }) {
  const { qtyByVariant, addItem, updateItem, removeItem } = useActiveCart();
  const variant = product.variants[0];
  const entry = variant ? qtyByVariant[variant.id] : undefined;
  const qty = entry?.qty ?? 0;
  const outOfStock = (variant?.qtyAvailable ?? 0) <= 0;
  const off = variant && variant.mrp > variant.price ? Math.round((1 - variant.price / variant.mrp) * 100) : 0;
  const perUnit = variant ? unitPrice(variant.size, variant.price) : null;

  return (
    <article className="pcard" data-pid={product.id}>
      <Link href={`/product/${product.id}`} className={clsx('ptile', `t-${product.tileColor}`)} aria-label={product.name}>
        {off > 0 && <span className="off">{off}% off</span>}
        <ProductArt artKey={artKeyFor(product.name, product.category.slug)} tint={product.tileColor} />
      </Link>
      <span className="psize">
        {variant?.size}
        {perUnit && <span className="unitp"> {perUnit}</span>}
      </span>
      <h4>{product.name}</h4>
      {variant && (
        <div className="prow">
          <span className="price">
            ₹{variant.price}
            {off > 0 && <s>₹{variant.mrp}</s>}
          </span>
          {outOfStock ? (
            <span className="small" style={{ color: 'var(--mirchi)' }}>
              Out of stock
            </span>
          ) : (
            <QuantityStepper
              qty={qty}
              onAdd={() => addItem.mutate({ variantId: variant.id, qty: 1 })}
              onIncrement={() => (entry ? updateItem.mutate({ itemId: entry.itemId, qty: qty + 1 }) : addItem.mutate({ variantId: variant.id, qty: 1 }))}
              onDecrement={() =>
                entry && (qty <= 1 ? removeItem.mutate(entry.itemId) : updateItem.mutate({ itemId: entry.itemId, qty: qty - 1 }))
              }
            />
          )}
        </div>
      )}
    </article>
  );
}
