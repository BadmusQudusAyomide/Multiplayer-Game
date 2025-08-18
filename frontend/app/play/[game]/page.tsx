"use client";
import { useEffect, useState } from 'react';
import { useSearchParams, useRouter, useParams } from 'next/navigation';
import { lobbyApi, getLobbySocket, type GameType } from '@/src/lib/socket';
import { useAuth } from '@/src/store/useAuth';
import Link from 'next/link';

export default function PlayGame() {
  const mode = useSearchParams().get('mode');
  const router = useRouter();
  const params = useParams<{ game: 'ttt' | 'rps' }>();
  const [status, setStatus] = useState('');
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
      lobbyApi.acceptAi(gameType, token);
    } else {
      setStatus('Finding a player... If none within 12s, we will suggest AI.');
      lobbyApi.joinQueue(gameType, token);
    }

    return () => {
      s.off('match.found', onMatchFound);
      s.off('suggest.ai', onSuggestAi);
      if (mode === 'player') lobbyApi.leaveQueue(gameType, token);
    };
  }, [mode, token, gameType, router]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">{gameType === 'ttt' ? 'Tic‑Tac‑Toe' : 'Rock‑Paper‑Scissors'}</h1>
      <p className="text-gray-700">Mode: {mode}</p>
      <p>{status}</p>
      {!token && (
        <div className="flex gap-2">
          <Link href="/login" className="rounded border px-3 py-2">Login</Link>
          <Link href="/signup" className="rounded bg-emerald-600 px-3 py-2 text-white">Sign up</Link>
        </div>
      )}
      {status.includes('No player') && (
        <button
          onClick={() => {
            if (!token) return;
            lobbyApi.acceptAi(gameType, token);
            setStatus('Starting AI match...');
          }}
          className="rounded bg-emerald-600 px-4 py-2 text-white"
        >
          Play AI now
        </button>
      )}
    </div>
  );
}
