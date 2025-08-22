"use client";
import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { matchApi, getMatchSocket, disconnectMatchSocket } from '@/src/lib/socket';
import { useAuth } from '@/src/store/useAuth';
import { useMatch } from '@/src/store/useMatch';
import {
  Users,
  Clock,
  Trophy,
  Zap,
  Target,
  Crown,
  Home,
  Wifi,
  WifiOff,
  Timer,
  User,
  Bot,
  Sparkles,
  Swords,
  Circle,
  X,
  Copy,
  RefreshCw,
  CheckCircle,
  LogOut
} from 'lucide-react';

export default function MatchPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const token = useAuth((s) => s.token);
  const { scoreboard, incWin, incLoss, incDraw, reset, setId: setArenaId, currentRound, maxRounds, incRound, resetRounds } = useMatch();

  const [state, setState] = useState<any>(null);
  // Pre-match lobby state until both players click Start
  const [lobbyWait, setLobbyWait] = useState<{ playersInfo: any[]; ready: string[] } | null>(null);
  // Track if I clicked Start to disable button and change label
  const [iClickedReady, setIClickedReady] = useState(false);
  // Track last round result for lightweight feedback; no blocking modal
  const [lastResult, setLastResult] = useState<any>(null);
  const [roundOver, setRoundOver] = useState(false);
  const [showQuitModal, setShowQuitModal] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [connMsg, setConnMsg] = useState<string>('Connecting...');
  const [isConnected, setIsConnected] = useState(false);
  const [animateMove, setAnimateMove] = useState<number | null>(null);
  const [nextRoundStatus, setNextRoundStatus] = useState<'idle' | 'requesting' | 'pending'>('idle');
  // Opponent disconnect notice
  const [opponentLeft, setOpponentLeft] = useState<{ userId: string; ts: number } | null>(null);
  const [oppRejoinSeconds, setOppRejoinSeconds] = useState<number | null>(null);
  const GRACE_MS = useMemo(() => {
    const v = Number(process.env.NEXT_PUBLIC_MATCH_REJOIN_GRACE_MS || '15000');
    return Number.isFinite(v) && v > 0 ? v : 15000;
  }, []);

  const seat = state?.seat as 0 | 1 | undefined;
  // Refs to avoid stale state inside socket handlers
  const stateRef = useRef<any>(null);
  const seatRef = useRef<0 | 1 | undefined>(undefined);
  useEffect(() => { stateRef.current = state; seatRef.current = seat; }, [state, seat]);
  const myTurn = useMemo(() => {
    if (!state) return false;
    if (state.gameType === 'ttt') return state.turn === seat;
    if (state.gameType === 'rps') return !roundOver;
    return false;
  }, [state, seat, roundOver]);

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }
    setConnMsg('Connecting to match...');
    setIsConnected(false);

    const s = matchApi.join(id, token);
    // Track actual transport connection state for better UX
    const onConnected = () => {
      setIsConnected(true);
      setConnMsg('Connected. Joining match...');
      // Ensure join was received (redundant but safe)
      s.emit('match.join', { matchId: id });
    };
    const onDisconnected = () => {
      setIsConnected(false);
      setConnMsg('Disconnected. Reconnecting...');
    };
    s.on('connect', onConnected);
    s.on('disconnect', onDisconnected);

    // Fallback: if no lobby.wait/state within 4s after connect, re-send join
    let retryTimer: any = null;
    const scheduleRetry = () => {
      if (retryTimer) clearTimeout(retryTimer);
      retryTimer = setTimeout(() => {
        try {
          if (s.connected) {
            s.emit('match.join', { matchId: id });
          } else if (s.disconnected) {
            s.connect();
          }
        } catch {}
      }, 4000);
    };
    // Start initial retry window
    scheduleRetry();

    try { localStorage.setItem('lastMatchId', id); } catch {}
    setArenaId(id);
    resetRounds();

    const onLobbyWait = (payload: any) => {
      // payload: { matchId, playersInfo, ready }
      setLobbyWait({ playersInfo: payload?.playersInfo || [], ready: payload?.ready || [] });
      setConnMsg('Matched! Waiting for players to press Start...');
      setIsConnected(true);
      if (retryTimer) { clearTimeout(retryTimer); retryTimer = null; }
    };

    const onState = (payload: any) => {
      setState(payload);
      setLobbyWait(null);
      setIClickedReady(false);
      setConnMsg('');
      setIsConnected(true);
      setRoundOver(false);
      // clear last result when a new state's round begins
      setLastResult(null);
      if (retryTimer) { clearTimeout(retryTimer); retryTimer = null; }
    };

    const onEnd = (payload: any) => {
      setRoundOver(true);
      setLastResult(payload);
      // Auto dismiss round result after 3 seconds
      setTimeout(() => setLastResult(null), 3000);
      // If opponent quit, auto-exit after a short delay
      if (payload?.result === 'forfeit') {
        setConnMsg('Opponent left. Ending match...');
        setTimeout(() => {
          try { localStorage.removeItem('lastMatchId'); } catch {}
          disconnectMatchSocket();
          reset();
          router.push('/');
        }, 1500);
        return;
      }
      try {
        // Determine W/L/D based on latest state and payload, using refs to avoid stale closures
        const st = stateRef.current;
        const mySeat = seatRef.current;
        if (!st || mySeat === undefined) return;
        if (st.gameType === 'ttt') {
          const res = payload?.result as 'X' | 'O' | 'draw' | null | undefined;
          if (res === 'draw' || res === null || res === undefined) {
            incDraw();
          } else if ((res === 'X' && mySeat === 0) || (res === 'O' && mySeat === 1)) {
            incWin();
          } else {
            incLoss();
          }
        } else if (st.gameType === 'rps') {
          const res = payload?.result as 'a' | 'b' | 'draw' | undefined;
          if (res === 'draw') incDraw();
          else if ((res === 'a' && mySeat === 0) || (res === 'b' && mySeat === 1)) incWin();
          else incLoss();
        }
      } catch (e) {
        console.warn('Failed to update scoreboard', e);
      }
      // Round progression
      if (currentRound < maxRounds) {
        incRound();
        // Auto-request rematch to keep rounds continuous
        if (token) {
          setNextRoundStatus('requesting');
          matchApi.rematch(id, token);
        }
      } else {
        // Reached max rounds – show summary modal
        setShowQuitModal(true);
      }
    };

    const onErr = (e: any) => {
      console.error('match error', e);
      setConnMsg(typeof e?.message === 'string' ? `Error: ${e.message}` : 'Error joining match');
      setIsConnected(false);
    };

    const onConnectErr = (e: any) => {
      console.error('match connect_error', e);
      setConnMsg(typeof e?.message === 'string' ? `Connection error: ${e.message}` : 'Connection error');
      setIsConnected(false);
    };

    const onOpponentLeft = (payload: any) => {
      setOpponentLeft(payload);
      setConnMsg('Opponent disconnected. Waiting for rejoin...');
    };

    const onOpponentRejoined = () => {
      setOpponentLeft(null);
      setConnMsg('');
    };

    s.on('lobby.wait', onLobbyWait);
    s.on('state.update', onState);
    s.on('match.end', onEnd);
    s.on('opponent.left', onOpponentLeft);
    s.on('opponent.rejoined', onOpponentRejoined);
    s.on('error', onErr);
    s.on('connect_error', onConnectErr as any);
    s.on('rematch.pending', (p: any) => {
      setNextRoundStatus('pending');
      setConnMsg('Next round requested. Waiting for opponent...');
    });
    s.on('rematch.created', ({ matchId }: any) => {
      setNextRoundStatus('idle');
      // Navigate to new match id and keep scoreboard
      router.replace(`/match/${matchId}`);
    });
    s.on('move.rejected', (p: any) => {
      console.warn('Move rejected', p);
    });

    if (s.disconnected) s.connect();

    return () => {
      const ms = getMatchSocket();
      ms?.off('lobby.wait', onLobbyWait);
      ms?.off('state.update', onState);
      ms?.off('match.end', onEnd);
      ms?.off('error', onErr);
      ms?.off('connect_error', onConnectErr as any);
      ms?.off('rematch.pending');
      ms?.off('rematch.created');
      ms?.off('opponent.left', onOpponentLeft);
      ms?.off('opponent.rejoined', onOpponentRejoined);
      ms?.off('connect', onConnected);
      ms?.off('disconnect', onDisconnected);
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [id, token, router]);

  // Drive a visible countdown when opponentLeft is set
  useEffect(() => {
    if (!opponentLeft) { setOppRejoinSeconds(null); return; }
    const startedAt = Date.now();
    const tick = () => {
      const elapsed = Date.now() - startedAt;
      const remaining = Math.max(0, Math.ceil((GRACE_MS - elapsed) / 1000));
      setOppRejoinSeconds(remaining);
    };
    tick();
    const iv = setInterval(tick, 500);
    return () => clearInterval(iv);
  }, [opponentLeft, GRACE_MS]);

  const submitTtt = (idx: number) => {
    if (!token || roundOver || state?.gameType !== 'ttt') return;
    if (state.board?.[idx]) return;
    if (!myTurn) return;

    setAnimateMove(idx);
    setTimeout(() => setAnimateMove(null), 600);
    matchApi.moveTtt(id, idx, token);
  };

  const submitRps = (choice: 'rock' | 'paper' | 'scissors') => {
    if (!token || roundOver || state?.gameType !== 'rps') return;
    matchApi.moveRps(id, choice, token);
  };

  const copyMatchId = () => {
    navigator.clipboard.writeText(id);
  };

  const getPlayerSymbol = (cellValue: 'X' | 'O' | null, index: number) => {
    if (!cellValue) return null;

    const isAnimating = animateMove === index;
    const symbolClass = `w-9 h-9 sm:w-12 sm:h-12 ${cellValue === 'X'
        ? 'text-red-500'
        : 'text-blue-500'
      } ${isAnimating ? 'animate-bounce' : ''}`;

    return cellValue === 'X'
      ? <X className={symbolClass} />
      : <Circle className={symbolClass} />;
  };

  const renderTTT = () => {
    const board: (null | 'X' | 'O')[] = state?.board || Array(9).fill(null);

    return (
      <div className="flex flex-col items-center space-y-6 sm:space-y-8 w-full">
        <div className="grid grid-cols-3 gap-2 sm:gap-4 p-3 sm:p-6 bg-white/10 backdrop-blur-md rounded-2xl sm:rounded-3xl border border-white/20 w-full max-w-[90vw] sm:max-w-[380px] md:max-w-[420px]">
          {board.map((cell, i) => (
            <button
              key={i}
              onClick={() => submitTtt(i)}
              className={`aspect-square w-full rounded-2xl border-2 flex items-center justify-center transition-all duration-300 transform hover:scale-105 ${cell
                  ? 'bg-white/20 border-white/40 cursor-not-allowed'
                  : myTurn && !roundOver
                    ? 'bg-white/5 border-white/30 hover:bg-white/20 hover:border-white/60 cursor-pointer shadow-lg hover:shadow-2xl'
                    : 'bg-gray-500/10 border-gray-500/20 cursor-not-allowed opacity-50'
                }`}
              disabled={!!cell || !!roundOver || !myTurn}
            >
              {getPlayerSymbol(cell, i)}
            </button>
          ))}
        </div>
      </div>
    );
  };

  const renderRPS = () => {
    const choices = [
      { name: 'rock', emoji: '🪨', gradient: 'from-gray-500 to-gray-700' },
      { name: 'paper', emoji: '📄', gradient: 'from-blue-500 to-blue-700' },
      { name: 'scissors', emoji: '✂️', gradient: 'from-red-500 to-red-700' }
    ] as const;

    return (
      <div className="flex flex-col items-center space-y-6 sm:space-y-8">
        <div className="flex flex-wrap justify-center gap-4 sm:gap-6">
          {choices.map((choice) => (
            <button
              key={choice.name}
              onClick={() => submitRps(choice.name)}
              className={`group relative p-4 sm:p-6 md:p-8 rounded-3xl border-2 transition-all duration-300 transform hover:scale-105 sm:hover:scale-110 ${roundOver
                  ? 'bg-gray-500/20 border-gray-500/30 cursor-not-allowed opacity-50'
                  : `bg-gradient-to-br ${choice.gradient} border-white/30 hover:border-white/60 cursor-pointer shadow-2xl hover:shadow-3xl`
                }`}
              disabled={!!roundOver}
            >
              <div className="text-4xl sm:text-5xl md:text-6xl mb-2 sm:mb-4 group-hover:animate-pulse">{choice.emoji}</div>
              <div className="text-white font-bold text-lg sm:text-xl capitalize text-center">{choice.name}</div>
            </button>
          ))}
        </div>
      </div>
    );
  };

  const getGameTitle = () => {
    if (!state) return 'Loading...';
    return state.gameType === 'ttt' ? 'Tic-Tac-Toe Arena' : 'Rock Paper Scissors Battle';
  };

  const getStatusBadge = () => {
    if (!isConnected) {
      return (
        <div className="flex items-center gap-2 px-4 py-2 bg-red-500/20 border border-red-500/30 rounded-full text-red-300">
          <WifiOff className="w-4 h-4" />
          <span className="text-sm font-medium">Disconnected</span>
        </div>
      );
    }

    if (roundOver) {
      return (
        <div className="flex items-center gap-2 px-4 py-2 bg-yellow-500/20 border border-yellow-500/30 rounded-full text-yellow-300">
          <Trophy className="w-4 h-4" />
          <span className="text-sm font-medium">Round Complete</span>
        </div>
      );
    }

    if (myTurn) {
      return (
        <div className="flex items-center gap-2 px-4 py-2 bg-green-500/20 border border-green-500/30 rounded-full text-green-300">
          <Zap className="w-4 h-4 animate-pulse" />
          <span className="text-sm font-medium">Your Turn</span>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 border border-blue-500/30 rounded-full text-blue-300">
        <Clock className="w-4 h-4" />
        <span className="text-sm font-medium">Waiting...</span>
      </div>
    );
  };

  const getPlayerInfo = () => {
    if (!state || state.gameType !== 'ttt') return null;

    const isPlayerX = seat === 0;
    const playerSymbol = isPlayerX ? 'X' : 'O';
    const opponentSymbol = isPlayerX ? 'O' : 'X';

    const info = Array.isArray(state.playersInfo) ? state.playersInfo : [];
    const me = typeof seat === 'number' ? info[seat] : undefined;
    const opp = typeof seat === 'number' ? info[1 - (seat as number)] : undefined;
    const myName = me?.username || 'You';
    const oppName = opp?.username || (state.playedVs === 'ai' ? 'AI' : 'Opponent');

    return (
      <div className="flex flex-col sm:flex-row justify-center items-stretch sm:items-center gap-4 sm:gap-8 px-2">
        <div className="flex items-center gap-3 p-3 sm:p-4 bg-white/10 rounded-2xl border border-white/20">
          <div className="p-2 bg-red-500/20 rounded-lg">
            {isPlayerX ? <X className="w-5 h-5 sm:w-6 sm:h-6 text-red-400" /> : <Circle className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400" />}
          </div>
          <div>
            <div className="text-white font-semibold text-sm sm:text-base">{myName}</div>
            <div className="text-xs sm:text-sm text-gray-300">Playing {playerSymbol}</div>
          </div>
        </div>

        <div className="flex items-center gap-3 p-3 sm:p-4 bg-white/5 rounded-2xl border border-white/10">
          <div className="p-2 bg-gray-500/20 rounded-lg">
            {!isPlayerX ? <X className="w-5 h-5 sm:w-6 sm:h-6 text-red-400" /> : <Circle className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400" />}
          </div>
          <div>
            <div className="text-gray-300 font-semibold text-sm sm:text-base">{oppName}</div>
            <div className="text-xs sm:text-sm text-gray-400">Playing {opponentSymbol}</div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-20 left-10 w-64 h-64 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-64 h-64 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse delay-500"></div>
      </div>

      <div className="relative z-10 p-6 lg:p-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl">
              <Swords className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
                {getGameTitle()}
              </h1>
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                <button
                  onClick={copyMatchId}
                  className="flex items-center gap-2 px-3 py-1 bg-white/10 rounded-lg text-sm text-purple-200 hover:bg-white/20 transition-colors"
                >
                  <Copy className="w-4 h-4" />
                  <code className="font-mono">Match: {id}</code>
                </button>
                <div className="flex items-center gap-2">
                  <Wifi className={`w-4 h-4 ${isConnected ? 'text-green-400' : 'text-red-400'}`} />
                  <span className="text-sm text-gray-300">
                    {isConnected ? 'Connected' : 'Connecting...'}
                  </span>
                </div>
                {state && (
                  <div className="flex items-center gap-2 text-sm text-purple-200 bg-white/5 px-3 py-1 rounded-lg border border-white/10">
                    <span className="font-medium">Mode:</span>
                    <span className="uppercase">{state.playedVs === 'ai' ? 'AI' : 'PvP'}</span>
                  </div>
                )}
                <button
                  onClick={() => { if (token) { matchApi.quit(id, token); } try { localStorage.removeItem('lastMatchId'); } catch {} disconnectMatchSocket(); reset(); router.push('/online'); }}
                  className="flex items-center gap-2 px-3 py-1 bg-white/10 rounded-lg text-sm text-purple-200 hover:bg-white/20 transition-colors"
                  title="See online players"
                >
                  <Users className="w-4 h-4" /> Online
                </button>

        {/* Exit Confirmation (lightweight) */}
        {showExitConfirm && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6 max-w-sm w-full text-center">
              <h3 className="text-xl font-bold text-white mb-2">Exit Arena?</h3>
              <p className="text-purple-200 mb-6 text-sm">Your current scoreboard will be cleared.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowExitConfirm(false)}
                  className="flex-1 py-2 px-4 border border-white/20 text-white rounded-xl hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  onClick={() => { if (token) { matchApi.quit(id, token); } try { localStorage.removeItem('lastMatchId'); } catch {} disconnectMatchSocket(); reset(); router.push('/'); }}
                  className="flex-1 py-2 px-4 bg-gradient-to-r from-red-500 to-pink-600 text-white font-semibold rounded-xl hover:from-red-600 hover:to-pink-700"
                >
                  Exit
                </button>
              </div>
            </div>
          </div>
        )}
                <div className="flex items-center gap-2 text-sm text-purple-200 bg-white/5 px-3 py-1 rounded-lg border border-white/10">
                  <span className="font-medium">Round:</span>
                  <span>{currentRound} / {maxRounds}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {getStatusBadge()}
          </div>
        </div>

        {/* Scoreboard */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center gap-6 px-6 py-3 bg-white/10 rounded-2xl border border-white/20 text-white">
            <div className="flex items-center gap-2"><Crown className="w-5 h-5 text-yellow-300" /> <span className="font-semibold">Wins:</span> {scoreboard.wins}</div>
            <div className="flex items-center gap-2"><Target className="w-5 h-5 text-red-300" /> <span className="font-semibold">Losses:</span> {scoreboard.losses}</div>
            <div className="flex items-center gap-2"><CheckCircle className="w-5 h-5 text-green-300" /> <span className="font-semibold">Draws:</span> {scoreboard.draws}</div>
          </div>
        </div>

        {/* Connection Status or Lobby Wait */}
        {!state && connMsg && (
          <div className="text-center py-12">
            <div className="inline-flex items-center gap-3 px-6 py-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20">
              <RefreshCw className="w-6 h-6 text-purple-400 animate-spin" />
              <span className="text-white font-medium">{connMsg || 'Preparing arena...'}</span>
            </div>
          </div>
        )}

        {/* Pre-Match Lobby: show players and Start button */}
        {!state && lobbyWait && (
          <div className="mb-10 flex flex-col items-center gap-4">
            <div className="flex items-center gap-6 bg-white/5 rounded-2xl border border-white/10 px-5 py-4">
              {lobbyWait.playersInfo?.map((p: any) => (
                <div key={p.id} className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${lobbyWait.ready?.includes(p.id) ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-200' : 'bg-white/10 border-white/20 text-purple-100'}`}>
                  {p.id === 'AI' ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                  <span className="font-semibold">{p.username || p.id}</span>
                  <span className="text-xs opacity-80">{lobbyWait.ready?.includes(p.id) ? 'Ready' : 'Not ready'}</span>
                </div>
              ))}
            </div>
            {(() => {
              const waitingFor = lobbyWait.playersInfo?.find((p: any) => !lobbyWait.ready?.includes(p.id));
              const waitingName = waitingFor?.username || (waitingFor?.id === 'AI' ? 'AI' : 'opponent');
              return (
                <button
                  onClick={() => { if (token) { setIClickedReady(true); matchApi.ready(id, token); } }}
                  disabled={iClickedReady}
                  className={`px-6 py-3 rounded-2xl text-white font-semibold transition-all duration-300 transform border ${iClickedReady ? 'bg-gray-500/40 border-white/10 cursor-not-allowed' : 'hover:scale-105 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 border-white/20'}`}
                >
                  {iClickedReady ? `Waiting for ${waitingName}...` : 'Start'}
                </button>
              );
            })()}
          </div>
        )}

        {/* Player Info */}
        {state && (
          <div className="mb-12 flex flex-wrap justify-center">
            {getPlayerInfo()}
          </div>
        )}

        {/* Opponent Left Banner */}
        {opponentLeft && !roundOver && (
          <div className="mb-6 flex justify-center">
            <div className="flex items-center gap-3 px-5 py-3 rounded-xl bg-red-500/20 text-red-100 border border-red-400/40">
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span>
                Opponent disconnected. Waiting for rejoin{typeof oppRejoinSeconds === 'number' ? ` (${oppRejoinSeconds}s)` : '...'}
              </span>
            </div>
          </div>
        )}

        {/* Inline Actions above board (mobile-friendly) */}
        <div className="flex justify-center mb-6">
          <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md px-2">
            <button
              onClick={() => setShowExitConfirm(true)}
              className="px-6 py-3 rounded-2xl text-white font-semibold transition-all duration-300 border bg-white/10 hover:bg-white/20 border-white/10"
            >
              <span className="inline-flex items-center gap-2 justify-center w-full"><LogOut className="w-4 h-4" /> Exit</span>
            </button>
          </div>
        </div>

        {/* Game Board */}
        <div className="flex justify-center mb-12 px-2">
          {state?.gameType === 'ttt' && renderTTT()}
          {state?.gameType === 'rps' && renderRPS()}
        </div>

        {/* Next Round Controls */}
        {roundOver && (
          <div className="flex justify-center mb-12 px-2">
            <div className="flex flex-col sm:flex-row gap-3 w-full max-w-2xl">
              <button
                onClick={() => {
                  if (!token) return;
                  setNextRoundStatus('requesting');
                  matchApi.rematch(id, token);
                }}
                disabled={nextRoundStatus !== 'idle'}
                className={`flex-1 px-6 py-3 rounded-2xl text-white font-semibold transition-all duration-300 transform hover:scale-105 border ${
                  nextRoundStatus === 'idle'
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 border-white/20'
                    : 'bg-gray-500/30 border-white/10 cursor-not-allowed'
                }`}
              >
                {nextRoundStatus === 'idle' && 'Next Round'}
                {nextRoundStatus === 'requesting' && 'Requesting...'}
                {nextRoundStatus === 'pending' && 'Waiting for opponent...'}
              </button>
              <button
                onClick={() => setShowExitConfirm(true)}
                className="flex-1 px-6 py-3 rounded-2xl text-white font-semibold transition-all duration-300 border bg-white/10 hover:bg-white/20 border-white/10"
              >
                <span className="inline-flex items-center gap-2 justify-center w-full"><LogOut className="w-4 h-4" /> Exit</span>
              </button>
            </div>
          </div>
        )}

        {/* Quit -> Game Over Modal */}
        {showQuitModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 p-8 max-w-md w-full text-center">
              <div className="p-4 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full w-fit mx-auto mb-6">
                <Trophy className="w-12 h-12 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-white mb-4">Game Over</h2>
              <div className="p-4 bg-white/5 rounded-2xl border border-white/10 mb-6 text-purple-200">
                <div className="font-semibold mb-2">Final Scoreboard</div>
                <div className="flex justify-center gap-6">
                  <div>Wins: <span className="text-green-300">{scoreboard.wins}</span></div>
                  <div>Losses: <span className="text-red-300">{scoreboard.losses}</span></div>
                  <div>Draws: <span className="text-blue-300">{scoreboard.draws}</span></div>
                </div>
              </div>
              <div className="flex gap-4">
                <button
                  onClick={() => setShowQuitModal(false)}
                  className="flex-1 py-3 px-6 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-2xl hover:from-blue-600 hover:to-purple-700 transition-all duration-300 transform hover:scale-105"
                >
                  Continue Playing
                </button>
                <button
                  onClick={() => { if (token) { matchApi.quit(id, token); } disconnectMatchSocket(); reset(); router.push('/'); }}
                  className="flex-1 py-3 px-6 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold rounded-2xl hover:from-emerald-600 hover:to-teal-700 transition-all duration-300 transform hover:scale-105"
                >
                  Exit Arena
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="fixed inset-x-0 bottom-3 sm:inset-auto sm:bottom-6 sm:right-6 flex justify-center sm:justify-end gap-3">
          <div className="flex flex-row sm:flex-col gap-3">
            {/* Quit to show final modal */}
            <button
              onClick={() => setShowQuitModal(true)}
              className="p-3 sm:p-4 bg-gradient-to-r from-rose-500 to-red-600 backdrop-blur-md rounded-full border border-white/20 text-white hover:from-rose-600 hover:to-red-700 transition-all duration-300 transform hover:scale-105 sm:hover:scale-110 shadow-2xl"
              title="Quit and view Game Over"
            >
              <Trophy className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
            <button
              onClick={() => { if (token) { matchApi.quit(id, token); } try { localStorage.removeItem('lastMatchId'); } catch {} disconnectMatchSocket(); reset(); router.push('/'); }}
              className="p-3 sm:p-4 bg-white/10 backdrop-blur-md rounded-full border border-white/20 text-white hover:bg-white/20 transition-all duration-300 transform hover:scale-105 sm:hover:scale-110 shadow-2xl"
              title="Home"
            >
              <Home className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>
        </div>

        {/* Lightweight round result toast */}
        {lastResult && (
          <div className="fixed inset-x-0 bottom-24 flex justify-center z-40">
            <div className="px-4 py-2 bg-white/10 border border-white/20 rounded-full text-purple-200 backdrop-blur-md">
              {lastResult?.result === 'forfeit' ? (
                <span className="font-semibold">Opponent left. Match ended.</span>
              ) : (
                <>
                  <span className="font-semibold">Round Result:</span> {JSON.stringify(lastResult)}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}