'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AuthUser {
  id: string;
  phone: string | null;
  email: string | null;
  name: string | null;
}

interface AuthState {
  accessToken: string | null;
  user: AuthUser | null;
  setAuth: (accessToken: string, user: AuthUser) => void;
  setUser: (user: AuthUser) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      user: null,
      setAuth: (accessToken, user) => set({ accessToken, user }),
      setUser: (user) => set({ user }),
      clear: () => set({ accessToken: null, user: null }),
    }),
    { name: 'tokri-auth' },
  ),
);
