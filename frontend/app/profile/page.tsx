"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/src/store/useAuth";

type Totals = {
  wins: number;
  losses: number;
  draws: number;
  ttt: { wins: number; losses: number; draws: number; elo: number };
  rps: { wins: number; losses: number; draws: number; elo: number };
};

type MatchRow = {
  id: string;
  gameType: "ttt" | "rps";
  playedVs: "human" | "ai";
  winnerUserId: string | null;
  result: "win" | "loss" | "draw" | "active";
  opponent: { id: string; username: string } | null;
  createdAt: string | null;
};

export default function ProfilePage() {
  const token = useAuth((s) => s.token);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [username, setUsername] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [matches, setMatches] = useState<MatchRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const base = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/$/, "");
        if (!base) throw new Error("API base URL is not configured. Set NEXT_PUBLIC_API_BASE_URL");
        if (!token) throw new Error("You must be logged in to view your profile");
        const res = await fetch(`${base}/me/profile`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.message || res.statusText || `HTTP ${res.status}`);
        }
        const data = await res.json();
        if (cancelled) return;
        setUsername(data.user?.username || "");
        setEmail(data.user?.email || "");
        setTotals(data.totals);
        setMatches(data.matches || []);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Failed to load profile");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    try {
      setSaving(true);
      setError(null);
      setSaveMsg(null);
      const base = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/$/, "");
      if (!base) throw new Error("API base URL is not configured. Set NEXT_PUBLIC_API_BASE_URL");
      const res = await fetch(`${base}/me/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ username, email }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.message || res.statusText || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setUsername(data.user?.username || username);
      setEmail(data.user?.email || email);
      setSaveMsg('Profile updated');
    } catch (e: any) {
      setError(e?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 md:px-6 py-6">
      <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">Profile</h1>
      <p className="text-gray-600">{username ? `@${username}` : ""}</p>

      {loading && (
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-gray-100 animate-pulse" />
          ))}
          <div className="md:col-span-3 h-64 rounded-xl bg-gray-100 animate-pulse" />
        </div>
      )}

      {!loading && error && (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 text-sm">
          {error}
        </div>
      )}

      {!loading && !error && (
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {/* Edit Profile */}
          <form onSubmit={onSave} className="rounded-xl border border-gray-200 p-4 md:col-span-3">
            <h2 className="text-lg font-semibold">Edit Profile</h2>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-sm text-gray-600">Username</span>
                <input
                  className="w-full rounded-lg border border-gray-300 p-2 outline-none focus:ring-2 focus:ring-blue-500"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="yourname"
                  required
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm text-gray-600">Email</span>
                <input
                  className="w-full rounded-lg border border-gray-300 p-2 outline-none focus:ring-2 focus:ring-blue-500"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </label>
            </div>
            <div className="mt-3 flex items-center gap-3">
              <button
                disabled={saving}
                className="rounded-lg bg-blue-600 px-4 py-2 text-white font-semibold disabled:opacity-60"
              >
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
              {saveMsg && <span className="text-sm text-green-700">{saveMsg}</span>}
            </div>
          </form>

          {totals && (
          <>
          <div className="rounded-xl border border-gray-200 p-4">
            <div className="text-sm text-gray-500">Total Wins</div>
            <div className="text-2xl font-bold">{totals.wins}</div>
          </div>
          <div className="rounded-xl border border-gray-200 p-4">
            <div className="text-sm text-gray-500">Total Losses</div>
            <div className="text-2xl font-bold">{totals.losses}</div>
          </div>
          <div className="rounded-xl border border-gray-200 p-4">
            <div className="text-sm text-gray-500">Total Draws</div>
            <div className="text-2xl font-bold">{totals.draws}</div>
          </div>

          <div className="rounded-xl border border-gray-200 p-4 md:col-span-3">
            <h2 className="text-lg font-semibold">Breakdown</h2>
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Tic-Tac-Toe</span>
                  <span className="text-sm text-gray-500">ELO: {totals.ttt.elo}</span>
                </div>
                <div className="mt-2 text-sm text-gray-700">
                  W {totals.ttt.wins} · L {totals.ttt.losses} · D {totals.ttt.draws}
                </div>
              </div>
              <div className="rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Rock Paper Scissors</span>
                  <span className="text-sm text-gray-500">ELO: {totals.rps.elo}</span>
                </div>
                <div className="mt-2 text-sm text-gray-700">
                  W {totals.rps.wins} · L {totals.rps.losses} · D {totals.rps.draws}
                </div>
              </div>
            </div>
          </div>
          </>
          )}
          <div className="md:col-span-3">
            <h2 className="text-lg font-semibold">Recent Matches</h2>
            {matches.length === 0 ? (
              <p className="mt-2 text-sm text-gray-600">No matches yet.</p>
            ) : (
              <ul className="mt-3 divide-y divide-gray-200 rounded-xl border border-gray-200">
                {matches.map((m) => (
                  <li key={m.id} className="p-4 flex items-center justify-between">
                    <div>
                      <div className="text-sm text-gray-800 font-medium">
                        {m.gameType === "ttt" ? "Tic-Tac-Toe" : "Rock Paper Scissors"}
                        {" "}· vs {m.opponent ? m.opponent.username : m.playedVs === "ai" ? "AI" : "?"}
                      </div>
                      <div className="text-xs text-gray-500">
                        {m.createdAt ? new Date(m.createdAt).toLocaleString() : ""}
                      </div>
                    </div>
                    <span
                      className={
                        "text-xs px-2 py-1 rounded-full font-semibold " +
                        (m.result === "win"
                          ? "bg-green-100 text-green-700"
                          : m.result === "loss"
                          ? "bg-red-100 text-red-700"
                          : m.result === "draw"
                          ? "bg-gray-100 text-gray-700"
                          : "bg-yellow-100 text-yellow-800")
                      }
                    >
                      {m.result}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
