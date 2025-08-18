"use client";
import { useEffect, useState } from 'react';

type Row = {
  username: string;
  email: string;
  wins: number;
  losses: number;
  draws: number;
  elo: number;
  gamesPlayed: number;
};

export default function LeaderboardPage() {
  const [game, setGame] = useState<'ttt'|'rps'>('ttt');
  const [sort, setSort] = useState<'elo'|'wins'>('elo');
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string|null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const url = `${process.env.NEXT_PUBLIC_API_BASE_URL}/leaderboard?game=${game}&sort=${sort}&limit=50`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Failed to load leaderboard`);
        const data = await res.json();
        if (!cancelled) setRows(data.rows || []);
      } catch (e: any) {
        if (!cancelled) setError(e.message || 'Error loading leaderboard');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [game, sort]);

  // Helpers for UI
  const winRate = (w: number, l: number, d: number) => {
    const t = w + l + d;
    return t ? Math.round((w / t) * 100) : 0;
  };
  const rankBadge = (i: number) => {
    if (i === 0) return 'bg-yellow-400 text-white';
    if (i === 1) return 'bg-gray-300 text-gray-800';
    if (i === 2) return 'bg-amber-500 text-white';
    return 'bg-blue-600 text-white';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                Leaderboard
              </h1>
              <p className="text-gray-600 mt-1">
                Top players by <span className="font-semibold">{sort.toUpperCase()}</span> · {game === 'ttt' ? 'Tic‑Tac‑Toe' : 'Rock‑Paper‑Scissors'}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <select
                className="px-4 py-2.5 rounded-xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={game}
                onChange={(e) => setGame(e.target.value as any)}
              >
                <option value="ttt">Tic‑Tac‑Toe</option>
                <option value="rps">Rock‑Paper‑Scissors</option>
              </select>
              <select
                className="px-4 py-2.5 rounded-xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={sort}
                onChange={(e) => setSort(e.target.value as any)}
              >
                <option value="elo">ELO Rating</option>
                <option value="wins">Total Wins</option>
              </select>
            </div>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-8 text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-500 border-t-transparent mx-auto mb-4" />
            <p className="text-gray-600">Loading leaderboard…</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
            <p className="text-red-700 font-medium">{error}</p>
          </div>
        )}

        {/* Content */}
        {!loading && !error && (
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
            {/* Desktop table */}
            <div className="hidden lg:block">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-5 py-3 text-left font-semibold text-gray-700">Rank</th>
                    <th className="px-5 py-3 text-left font-semibold text-gray-700">Player</th>
                    <th className="px-5 py-3 text-center font-semibold text-gray-700">ELO</th>
                    <th className="px-5 py-3 text-center font-semibold text-gray-700">Wins</th>
                    <th className="px-5 py-3 text-center font-semibold text-gray-700">Losses</th>
                    <th className="px-5 py-3 text-center font-semibold text-gray-700">Draws</th>
                    <th className="px-5 py-3 text-center font-semibold text-gray-700">Win Rate</th>
                    <th className="px-5 py-3 text-center font-semibold text-gray-700">Games</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rows.map((r, i) => (
                    <tr key={`${r.username}-${i}`} className="hover:bg-gray-50">
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center justify-center w-10 h-7 rounded-full text-xs font-bold ${rankBadge(i)}`}>{i + 1}</span>
                      </td>
                      <td className="px-5 py-3 font-semibold text-gray-900">{r.username}</td>
                      <td className="px-5 py-3 text-center">
                        <span className="inline-flex px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 font-semibold">{r.elo}</span>
                      </td>
                      <td className="px-5 py-3 text-center font-semibold text-green-600">{r.wins}</td>
                      <td className="px-5 py-3 text-center font-semibold text-red-600">{r.losses}</td>
                      <td className="px-5 py-3 text-center font-semibold text-gray-700">{r.draws}</td>
                      <td className="px-5 py-3 text-center">
                        {(() => {
                          const wr = winRate(r.wins, r.losses, r.draws);
                          const cls = wr >= 70 ? 'bg-green-100 text-green-800' : wr >= 50 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800';
                          return <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${cls}`}>{wr}%</span>;
                        })()}
                      </td>
                      <td className="px-5 py-3 text-center text-gray-700">{r.gamesPlayed}</td>
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr>
                      <td className="px-5 py-8 text-center text-gray-600" colSpan={8}>No players yet. Play some matches to appear here!</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="lg:hidden p-4 space-y-4">
              {rows.map((r, i) => (
                <div key={`${r.username}-${i}`} className="rounded-xl border border-gray-200 p-4 shadow-sm bg-white">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className={`inline-flex items-center justify-center w-9 h-7 rounded-full text-xs font-bold ${rankBadge(i)}`}>#{i + 1}</span>
                      <div className="font-bold text-gray-900">{r.username}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-500">ELO</div>
                      <div className="inline-flex px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold">{r.elo}</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                    <div className="text-center p-2 rounded bg-green-50">
                      <div className="text-green-700 font-bold">{r.wins}</div>
                      <div className="text-xs text-green-700/80">Wins</div>
                    </div>
                    <div className="text-center p-2 rounded bg-red-50">
                      <div className="text-red-700 font-bold">{r.losses}</div>
                      <div className="text-xs text-red-700/80">Losses</div>
                    </div>
                    <div className="text-center p-2 rounded bg-gray-50">
                      <div className="text-gray-700 font-bold">{r.draws}</div>
                      <div className="text-xs text-gray-600">Draws</div>
                    </div>
                    <div className="text-center p-2 rounded bg-blue-50">
                      <div className="text-blue-700 font-bold">{r.gamesPlayed}</div>
                      <div className="text-xs text-blue-700/80">Games</div>
                    </div>
                  </div>
                  <div className="mt-3 text-center">
                    {(() => {
                      const wr = winRate(r.wins, r.losses, r.draws);
                      const cls = wr >= 70 ? 'bg-green-100 text-green-800' : wr >= 50 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800';
                      return <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${cls}`}>{wr}% Win Rate</span>;
                    })()}
                  </div>
                </div>
              ))}
              {rows.length === 0 && (
                <div className="text-center py-10 text-gray-600">No players yet. Play some matches to appear here!</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
