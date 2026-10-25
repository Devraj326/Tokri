'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SessionState {
  storeId: string | null;
  storeName: string | null;
  etaMinutes: number | null;
  lat: number | null;
  lng: number | null;
  activeCartId: string | null;
  setLocation: (data: { storeId: string; storeName: string; etaMinutes: number; lat: number; lng: number }) => void;
  setActiveCart: (cartId: string | null) => void;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      storeId: null,
      storeName: null,
      etaMinutes: null,
      lat: null,
      lng: null,
      activeCartId: null,
      setLocation: ({ storeId, storeName, etaMinutes, lat, lng }) => set({ storeId, storeName, etaMinutes, lat, lng }),
      setActiveCart: (cartId) => set({ activeCartId: cartId }),
    }),
    { name: 'tokri-session' },
  ),
);
