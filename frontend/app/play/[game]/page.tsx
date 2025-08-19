"use client";
import { useEffect, useState } from 'react';
import { useSearchParams, useRouter, useParams } from 'next/navigation';
import { lobbyApi, getLobbySocket, type GameType } from '@/src/lib/socket';
import { useAuth } from '@/src/store/useAuth';
import Link from 'next/link';
import { Search, Clock } from 'lucide-react';

export default function PlayGame() {
  const mode = useSearchParams().get('mode');
  const router = useRouter();
  const params = useParams<{ game: 'ttt' | 'rps' }>();
  const [status, setStatus] = useState('');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const token = useAuth((s) => s.token);
  const gameType = (params?.game as GameType) ?? 'ttt';

  useEffect(() => {
    if (!mode) return;
    if (!token) {
      setStatus('Please login first.');
      return;
    }

    const s = getLobbySocket(token);

    const onMatchFound = (payload: any) => {
      if (payload?.matchId) router.replace(`/match/${payload.matchId}`);
    };
    const onSuggestAi = () => setStatus('No player found. Tap to switch to AI or keep waiting.');

    s.on('match.found', onMatchFound);
    s.on('suggest.ai', onSuggestAi);

    if (mode === 'ai') {
      setStatus('Starting AI match...');
      lobbyApi.acceptAi(gameType, token, difficulty);
    } else {
      setStatus('Finding a player... If none within 12s, we will suggest AI.');
      lobbyApi.joinQueue(gameType, token);
    }

    return () => {
      s.off('match.found', onMatchFound);
      s.off('suggest.ai', onSuggestAi);
      if (mode === 'player') lobbyApi.leaveQueue(gameType, token);
    };
  }, [mode, token, gameType, router, difficulty]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-20 left-10 w-64 h-64 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-64 h-64 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse delay-500"></div>
      </div>

      <div className="relative z-10 p-6 lg:p-8 max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl">
            <Search className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
            {gameType === 'ttt' ? 'Tic‑Tac‑Toe' : 'Rock‑Paper‑Scissors'}
          </h1>
        </div>

        <div className="bg-white/10 backdrop-blur-md rounded-3xl p-6 border border-white/20 text-purple-100">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <span className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-sm">
              Mode: <span className="font-semibold uppercase">{mode ?? '—'}</span>
            </span>
            {mode === 'ai' && (
              <span className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-sm flex items-center gap-2">
                <span className="font-medium">Difficulty:</span>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as any)}
                  className="bg-transparent border border-white/20 rounded px-2 py-1 text-white focus:outline-none"
                >
                  <option value="easy" className="bg-slate-800">Easy</option>
                  <option value="medium" className="bg-slate-800">Medium</option>
                  <option value="hard" className="bg-slate-800">Hard</option>
                </select>
              </span>
            )}
            <span className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-sm flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>{status || 'Preparing...'}</span>
            </span>
          </div>

          {!token && (
            <div className="flex gap-2">
              <Link href="/login" className="rounded border border-white/20 px-3 py-2 hover:bg-white/10 transition-colors">Login</Link>
              <Link href="/signup" className="rounded bg-emerald-600 px-3 py-2 text-white hover:bg-emerald-700 transition-colors">Sign up</Link>
            </div>
          )}

          {status.includes('No player') && (
            <button
              onClick={() => {
                if (!token) return;
                lobbyApi.acceptAi(gameType, token, difficulty);
                setStatus('Starting AI match...');
              }}
              className="mt-4 rounded bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700 transition-colors"
            >
              Play AI now
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
