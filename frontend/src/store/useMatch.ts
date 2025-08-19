"use client";
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Scoreboard = { wins: number; losses: number; draws: number };

type MatchState = {
  id: string | null;
  scoreboard: Scoreboard;
  currentRound: number;
  maxRounds: number;
  setId: (id: string | null) => void;
  incWin: () => void;
  incLoss: () => void;
  incDraw: () => void;
  incRound: () => void;
  resetRounds: () => void;
  setMaxRounds: (n: number) => void;
  reset: () => void;
};

export const useMatch = create<MatchState>()(
  persist(
    (set) => ({
      id: null,
      scoreboard: { wins: 0, losses: 0, draws: 0 },
      currentRound: 1,
      maxRounds: 20,
      setId: (id) => set({ id }),
      incWin: () => set((s) => ({ scoreboard: { ...s.scoreboard, wins: s.scoreboard.wins + 1 } })),
      incLoss: () => set((s) => ({ scoreboard: { ...s.scoreboard, losses: s.scoreboard.losses + 1 } })),
      incDraw: () => set((s) => ({ scoreboard: { ...s.scoreboard, draws: s.scoreboard.draws + 1 } })),
      incRound: () => set((s) => ({ currentRound: s.currentRound + 1 })),
      resetRounds: () => set({ currentRound: 1 }),
      setMaxRounds: (n) => set({ maxRounds: Math.max(1, n) }),
      reset: () => set({ id: null, scoreboard: { wins: 0, losses: 0, draws: 0 }, currentRound: 1 }),
    }),
    { name: 'match-arena-store' }
  )
);
