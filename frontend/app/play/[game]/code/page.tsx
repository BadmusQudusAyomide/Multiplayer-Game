"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/src/store/useAuth";
import { getLobbySocket, type GameType } from "@/src/lib/socket";

export default function PlayWithCodePage() {
  const params = useParams<{ game: "ttt" | "rps" }>();
  const gameType = (params?.game as GameType) ?? "ttt";
  const token = useAuth((s) => s.token);
  const router = useRouter();
  const [tab, setTab] = useState<"host" | "join">("host");
  const [status, setStatus] = useState<string>("");
  const [code, setCode] = useState<string>("");
  const [hosting, setHosting] = useState(false);
  const [hostCode, setHostCode] = useState<string>("");
  const [copied, setCopied] = useState(false);

  const socket = useMemo(() => (token ? getLobbySocket(token) : null), [token]);

  useEffect(() => {
    if (!socket) return;
    // Ensure the lobby socket is actually connected
    if (socket.disconnected) socket.connect();
    const onConnect = () => {
      setStatus((prev) => prev && prev.toLowerCase().includes('disconnect') ? 'Connected.' : prev);
    };
    const onDisconnect = () => {
      setStatus('Disconnected. Reconnecting...');
    };
    const onMatchFound = (payload: any) => {
      if (payload?.matchId) router.replace(`/match/${payload.matchId}`);
    };
    const onCodeCreated = (p: any) => {
      setHostCode((p?.code || '').toString());
      setStatus('Share this code with your friend. Waiting for them to join…');
    };
    const onCodeCanceled = () => {
      setHosting(false);
      setHostCode("");
      setStatus("Hosting canceled.");
    };
    const onCodeError = (p: any) => {
      setStatus(p?.message || "Code error");
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on("match.found", onMatchFound);
    socket.on("code.created", onCodeCreated);
    socket.on("code.canceled", onCodeCanceled);
    socket.on("code.error", onCodeError);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off("match.found", onMatchFound);
      socket.off("code.created", onCodeCreated);
      socket.off("code.canceled", onCodeCanceled);
      socket.off("code.error", onCodeError);
    };
  }, [socket, router]);

  function startHosting() {
    if (!socket || !token) return;
    setHosting(true);
    setStatus("Generating code…");
    const emitCreate = () => socket.emit("code.create", { gameType });
    if (socket.connected) {
      emitCreate();
    } else {
      socket.once('connect', emitCreate);
      if (socket.disconnected) socket.connect();
    }
    // Fallback retry if code isn't created quickly
    setTimeout(() => {
      if (!hostCode) {
        try {
          if (socket.connected) emitCreate();
        } catch {}
      }
    }, 2500);
  }

  function cancelHosting() {
    if (!socket || !token) return;
    const emitCancel = () => socket.emit("code.cancel");
    if (socket.connected) emitCancel(); else { socket.once('connect', emitCancel); if (socket.disconnected) socket.connect(); }
  }

  function joinWithCode(e: React.FormEvent) {
    e.preventDefault();
    if (!socket || !token) return;
    const c = code.trim();
    if (!c) return setStatus("Enter a code");
    setStatus("Joining match…");
    const emitJoin = () => socket.emit("code.join", { code: c });
    if (socket.connected) {
      emitJoin();
    } else {
      socket.once('connect', emitJoin);
      if (socket.disconnected) socket.connect();
    }
    // Fallback retry if match.found does not arrive soon
    setTimeout(() => {
      try {
        if (socket.connected) emitJoin();
      } catch {}
    }, 4000);
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-sm w-full rounded-2xl border border-gray-200 p-6 text-center">
          <h1 className="text-xl font-bold">Play with Code</h1>
          <p className="mt-2 text-gray-600">Please login to continue.</p>
          <div className="mt-4 flex justify-center gap-2">
            <Link href="/login" className="rounded border border-gray-300 px-3 py-2 hover:bg-gray-50">Login</Link>
            <Link href="/signup" className="rounded bg-blue-600 px-3 py-2 text-white hover:bg-blue-700">Sign up</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      <div className="relative z-10 p-6 lg:p-8 max-w-2xl mx-auto">
        <h1 className="text-2xl lg:text-3xl font-bold text-white">Play with Code · {gameType === "ttt" ? "Tic‑Tac‑Toe" : "Rock‑Paper‑Scissors"}</h1>

        <div className="mt-4 rounded-3xl bg-white/10 backdrop-blur-md border border-white/20 p-6 text-purple-100">
          <div className="flex gap-2 mb-4">
            <button
              className={`px-3 py-2 rounded-lg ${tab === "host" ? "bg-white/20" : "bg-transparent border border-white/10"}`}
              onClick={() => setTab("host")}
            >
              Host & Generate Code
            </button>
            <button
              className={`px-3 py-2 rounded-lg ${tab === "join" ? "bg-white/20" : "bg-transparent border border-white/10"}`}
              onClick={() => setTab("join")}
            >
              Join with Code
            </button>
          </div>

          {tab === "host" ? (
            <div>
              {!hosting ? (
                <button
                  onClick={startHosting}
                  className="rounded bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700"
                >
                  Generate Code
                </button>
              ) : (
                <div className="space-y-3">
                  <div className="text-sm text-purple-200">Share this code with your friend</div>
                  <div className="text-4xl font-extrabold tracking-widest text-white">{hostCode || "------"}</div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={async () => {
                        try {
                          if (hostCode) {
                            await navigator.clipboard.writeText(hostCode);
                            setCopied(true);
                            setTimeout(() => setCopied(false), 1200);
                          }
                        } catch {}
                      }}
                      disabled={!hostCode}
                      className={`rounded px-4 py-2 text-white transition-colors ${hostCode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-600/40 cursor-not-allowed'}`}
                      title={hostCode ? 'Copy code to clipboard' : 'Code not ready yet'}
                    >
                      {copied ? 'Copied!' : 'Copy Code'}
                    </button>
                    <button onClick={cancelHosting} className="rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700">Quit Hosting</button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={joinWithCode} className="space-y-3">
              <label className="block">
                <span className="mb-1 block text-sm text-purple-200">Enter Code</span>
                <input
                  className="w-full rounded-xl border border-white/20 bg-black/20 p-3 text-white placeholder-purple-200/60 outline-none focus:ring-2 focus:ring-purple-400/60"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="ABC123"
                />
              </label>
              <button className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">Join Match</button>
            </form>
          )}

          {status && <div className="mt-4 text-sm text-purple-200">{status}</div>}
        </div>

        <div className="mt-6">
          <Link href={`/play/${gameType}?mode=player`} className="text-purple-200 underline underline-offset-4">Back to normal matchmaking</Link>
        </div>
      </div>
    </div>
  );
}
