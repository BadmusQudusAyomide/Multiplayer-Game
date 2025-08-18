"use client";
import { create } from 'zustand';

type MatchState = {
  id: string | null;
  setId: (id: string | null) => void;
};

export const useMatch = create<MatchState>((set) => ({
  id: null,
  setId: (id) => set({ id }),
}));
