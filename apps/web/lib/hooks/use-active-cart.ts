'use client';

import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { addCartItem, createSoloCart, getCart, getBill, removeCartItem, updateCartItem } from '../api/cart';
import { useSessionStore } from '../store/session';
import { useAuthStore } from '../store/auth';

export function useActiveCart() {
  const storeId = useSessionStore((s) => s.storeId);
  const activeCartId = useSessionStore((s) => s.activeCartId);
  const setActiveCart = useSessionStore((s) => s.setActiveCart);
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();

  const cartQuery = useQuery({
    queryKey: ['cart', activeCartId],
    queryFn: () => getCart(activeCartId!),
    enabled: !!activeCartId,
  });

  const billQuery = useQuery({
    queryKey: ['cart-bill', activeCartId],
    queryFn: () => getBill(activeCartId!),
    enabled: !!activeCartId && (cartQuery.data?.items.length ?? 0) > 0,
  });

  async function ensureCart(): Promise<string> {
    if (activeCartId) return activeCartId;
    if (!storeId) throw new Error('No store selected yet');
    const cart = await createSoloCart(storeId);
    setActiveCart(cart.id);
    qc.setQueryData(['cart', cart.id], cart);
    return cart.id;
  }

  const addItem = useMutation({
    mutationFn: async ({ variantId, qty, note }: { variantId: string; qty: number; note?: string }) => {
      const cartId = await ensureCart();
      return addCartItem(cartId, variantId, qty, note);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cart'] });
      qc.invalidateQueries({ queryKey: ['cart-bill'] });
    },
  });

  const updateItem = useMutation({
    mutationFn: ({ itemId, qty }: { itemId: string; qty: number }) => updateCartItem(activeCartId!, itemId, qty),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cart'] });
      qc.invalidateQueries({ queryKey: ['cart-bill'] });
    },
  });

  const removeItem = useMutation({
    mutationFn: (itemId: string) => removeCartItem(activeCartId!, itemId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cart'] });
      qc.invalidateQueries({ queryKey: ['cart-bill'] });
    },
  });

  const qtyByVariant: Record<string, { itemId: string; qty: number }> = {};
  for (const item of cartQuery.data?.items ?? []) {
    if (item.addedBy === user?.id) qtyByVariant[item.variantId] = { itemId: item.id, qty: item.qty };
  }

  return {
    cart: cartQuery.data,
    bill: billQuery.data,
    isLoading: cartQuery.isLoading,
    qtyByVariant,
    addItem,
    updateItem,
    removeItem,
    ensureCart,
  };
}
