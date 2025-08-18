"use client";
import { create } from 'zustand';

type LobbyState = {
  game: 'ttt' | 'rps' | null;
  mode: 'player' | 'ai' | null;
  set: (s: Partial<LobbyState>) => void;
};

export const useLobby = create<LobbyState>((set) => ({
  game: null,
  mode: null,
  set: (s) => set(s),
}));
