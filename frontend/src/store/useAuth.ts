"use client";
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AuthState = {
  token: string | null;
  setToken: (t: string | null) => void;
};

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      setToken: (t) => set({ token: t }),
    }),
    { name: 'auth-store' }
  )
);
