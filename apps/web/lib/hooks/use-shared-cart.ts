'use client';

import { useEffect, useRef, useState } from 'react';
import { getCart, type CartStateDto, type CartItemDto, type CartMemberDto } from '../api/cart';
import { getSocket } from '../socket';

export function useSharedCart(cartId: string) {
  const [cart, setCart] = useState<CartStateDto | null>(null);
  const versionRef = useRef(-1);

  useEffect(() => {
    let cancelled = false;
    getCart(cartId).then((data) => {
      if (!cancelled) {
        setCart(data);
        versionRef.current = data.version;
      }
    });

    const socket = getSocket();
    socket.emit('cart:join', { cartId });

    function resync() {
      getCart(cartId).then((data) => {
        setCart(data);
        versionRef.current = data.version;
      });
    }

    function acceptVersion(version: number) {
      if (version <= versionRef.current) return false;
      versionRef.current = version;
      return true;
    }

    function onState(payload: CartStateDto) {
      setCart(payload);
      versionRef.current = payload.version;
    }

    function onItemAdded(payload: { cartId: string; item: CartItemDto; version: number }) {
      if (payload.cartId !== cartId || !acceptVersion(payload.version)) return;
      setCart((prev) => (prev ? { ...prev, version: payload.version, items: [...prev.items, payload.item] } : prev));
    }

    function onItemUpdated(payload: { cartId: string; item: CartItemDto; version: number }) {
      if (payload.cartId !== cartId || !acceptVersion(payload.version)) return;
      setCart((prev) =>
        prev
          ? { ...prev, version: payload.version, items: prev.items.map((i) => (i.id === payload.item.id ? payload.item : i)) }
          : prev,
      );
    }

    function onItemRemoved(payload: { cartId: string; itemId: string; version: number }) {
      if (payload.cartId !== cartId || !acceptVersion(payload.version)) return;
      setCart((prev) => (prev ? { ...prev, version: payload.version, items: prev.items.filter((i) => i.id !== payload.itemId) } : prev));
    }

    function onMemberJoined(payload: { cartId: string; member: CartMemberDto; version: number }) {
      if (payload.cartId !== cartId) return;
      resync();
    }

    function onMemberLeft(payload: { cartId: string }) {
      if (payload.cartId !== cartId) return;
      resync();
    }

    function onLocked(payload: { cartId: string; version: number }) {
      if (payload.cartId !== cartId) return;
      setCart((prev) => (prev ? { ...prev, status: 'locked', version: payload.version } : prev));
    }

    function onSplitUpdated(payload: { cartId: string; splitMode: CartStateDto['splitMode']; version: number }) {
      if (payload.cartId !== cartId) return;
      setCart((prev) => (prev ? { ...prev, splitMode: payload.splitMode, version: payload.version } : prev));
    }

    socket.on('cart:state', onState);
    socket.on('item:added', onItemAdded);
    socket.on('item:updated', onItemUpdated);
    socket.on('item:removed', onItemRemoved);
    socket.on('member:joined', onMemberJoined);
    socket.on('member:left', onMemberLeft);
    socket.on('cart:locked', onLocked);
    socket.on('split:updated', onSplitUpdated);

    return () => {
      cancelled = true;
      socket.off('cart:state', onState);
      socket.off('item:added', onItemAdded);
      socket.off('item:updated', onItemUpdated);
      socket.off('item:removed', onItemRemoved);
      socket.off('member:joined', onMemberJoined);
      socket.off('member:left', onMemberLeft);
      socket.off('cart:locked', onLocked);
      socket.off('split:updated', onSplitUpdated);
    };
  }, [cartId]);

  return { cart, refresh: () => getCart(cartId).then(setCart) };
}
