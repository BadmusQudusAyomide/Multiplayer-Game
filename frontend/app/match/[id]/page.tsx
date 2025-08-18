"use client";
import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { matchApi, getMatchSocket } from '@/src/lib/socket';
import { useAuth } from '@/src/store/useAuth';
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
  CheckCircle
} from 'lucide-react';

export default function MatchPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const token = useAuth((s) => s.token);

  const [state, setState] = useState<any>(null);
  const [ended, setEnded] = useState<any>(null);
  const [connMsg, setConnMsg] = useState<string>('Connecting...');
  const [isConnected, setIsConnected] = useState(false);
  const [animateMove, setAnimateMove] = useState<number | null>(null);

  const seat = state?.seat as 0 | 1 | undefined;
  const myTurn = useMemo(() => {
    if (!state) return false;
    if (state.gameType === 'ttt') return state.turn === seat;
    if (state.gameType === 'rps') return !ended;
    return false;
  }, [state, seat, ended]);

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }
    setConnMsg('Connecting to match...');
    setIsConnected(false);

    const s = matchApi.join(id, token);

    const onState = (payload: any) => {
      setState(payload);
      setConnMsg('');
      setIsConnected(true);
    };

    const onEnd = (payload: any) => setEnded(payload);

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

    s.on('state.update', onState);
    s.on('match.end', onEnd);
    s.on('error', onErr);
    s.on('connect_error', onConnectErr as any);
    s.on('move.rejected', (p: any) => {
      console.warn('Move rejected', p);
    });

    if (s.disconnected) s.connect();

    return () => {
      const ms = getMatchSocket();
      ms?.off('state.update', onState);
      ms?.off('match.end', onEnd);
      ms?.off('error', onErr);
      ms?.off('connect_error', onConnectErr as any);
    };
  }, [id, token, router]);

  const submitTtt = (idx: number) => {
    if (!token || ended || state?.gameType !== 'ttt') return;
    if (state.board?.[idx]) return;
    if (!myTurn) return;

    setAnimateMove(idx);
    setTimeout(() => setAnimateMove(null), 600);
    matchApi.moveTtt(id, idx, token);
  };

  const submitRps = (choice: 'rock' | 'paper' | 'scissors') => {
    if (!token || ended || state?.gameType !== 'rps') return;
    matchApi.moveRps(id, choice, token);
  };

  const copyMatchId = () => {
    navigator.clipboard.writeText(id);
  };

  const getPlayerSymbol = (cellValue: 'X' | 'O' | null, index: number) => {
    if (!cellValue) return null;

    const isAnimating = animateMove === index;
    const symbolClass = `w-12 h-12 ${cellValue === 'X'
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
      <div className="flex flex-col items-center space-y-8">
        <div className="grid grid-cols-3 gap-4 p-6 bg-white/10 backdrop-blur-md rounded-3xl border border-white/20">
          {board.map((cell, i) => (
            <button
              key={i}
              onClick={() => submitTtt(i)}
              className={`w-24 h-24 lg:w-28 lg:h-28 rounded-2xl border-2 flex items-center justify-center transition-all duration-300 transform hover:scale-105 ${cell
                  ? 'bg-white/20 border-white/40 cursor-not-allowed'
                  : myTurn && !ended
                    ? 'bg-white/5 border-white/30 hover:bg-white/20 hover:border-white/60 cursor-pointer shadow-lg hover:shadow-2xl'
                    : 'bg-gray-500/10 border-gray-500/20 cursor-not-allowed opacity-50'
                }`}
              disabled={!!cell || !!ended || !myTurn}
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
      <div className="flex flex-col items-center space-y-8">
        <div className="flex flex-wrap justify-center gap-6">
          {choices.map((choice) => (
            <button
              key={choice.name}
              onClick={() => submitRps(choice.name)}
              className={`group relative p-8 rounded-3xl border-2 transition-all duration-300 transform hover:scale-110 ${ended
                  ? 'bg-gray-500/20 border-gray-500/30 cursor-not-allowed opacity-50'
                  : `bg-gradient-to-br ${choice.gradient} border-white/30 hover:border-white/60 cursor-pointer shadow-2xl hover:shadow-3xl`
                }`}
              disabled={!!ended}
            >
              <div className="text-6xl mb-4 group-hover:animate-pulse">{choice.emoji}</div>
              <div className="text-white font-bold text-xl capitalize">{choice.name}</div>
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

    if (ended) {
      return (
        <div className="flex items-center gap-2 px-4 py-2 bg-yellow-500/20 border border-yellow-500/30 rounded-full text-yellow-300">
          <Trophy className="w-4 h-4" />
          <span className="text-sm font-medium">Game Ended</span>
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

    return (
      <div className="flex justify-center gap-8">
        <div className="flex items-center gap-3 p-4 bg-white/10 rounded-2xl border border-white/20">
          <div className="p-2 bg-red-500/20 rounded-lg">
            {isPlayerX ? <X className="w-6 h-6 text-red-400" /> : <Circle className="w-6 h-6 text-blue-400" />}
          </div>
          <div>
            <div className="text-white font-semibold">You</div>
            <div className="text-sm text-gray-300">Playing {playerSymbol}</div>
          </div>
        </div>

        <div className="flex items-center gap-3 p-4 bg-white/5 rounded-2xl border border-white/10">
          <div className="p-2 bg-gray-500/20 rounded-lg">
            {!isPlayerX ? <X className="w-6 h-6 text-red-400" /> : <Circle className="w-6 h-6 text-blue-400" />}
          </div>
          <div>
            <div className="text-gray-300 font-semibold">Opponent</div>
            <div className="text-sm text-gray-400">Playing {opponentSymbol}</div>
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
              <div className="flex items-center gap-3 mt-2">
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
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {getStatusBadge()}
          </div>
        </div>

        {/* Connection Status */}
        {!state && connMsg && (
          <div className="text-center py-12">
            <div className="inline-flex items-center gap-3 px-6 py-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20">
              <RefreshCw className="w-6 h-6 text-purple-400 animate-spin" />
              <span className="text-white font-medium">{connMsg}</span>
            </div>
          </div>
        )}

        {/* Player Info */}
        {state && (
          <div className="mb-12">
            {getPlayerInfo()}
          </div>
        )}

        {/* Game Board */}
        <div className="flex justify-center mb-12">
          {state?.gameType === 'ttt' && renderTTT()}
          {state?.gameType === 'rps' && renderRPS()}
        </div>

        {/* Game End Modal */}
        {ended && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 p-8 max-w-md w-full text-center">
              <div className="p-4 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full w-fit mx-auto mb-6">
                <Trophy className="w-12 h-12 text-white" />
              </div>

              <h2 className="text-3xl font-bold text-white mb-4">Game Over!</h2>

              <div className="p-4 bg-white/5 rounded-2xl border border-white/10 mb-6">
                <pre className="text-sm text-purple-200 font-mono overflow-auto max-h-40">
                  {JSON.stringify(ended, null, 2)}
                </pre>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => window.location.reload()}
                  className="flex-1 py-3 px-6 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-2xl hover:from-blue-600 hover:to-purple-700 transition-all duration-300 transform hover:scale-105"
                >
                  Play Again
                </button>
                <button
                  onClick={() => router.push('/')}
                  className="flex-1 py-3 px-6 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold rounded-2xl hover:from-emerald-600 hover:to-teal-700 transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-2"
                >
                  <Home className="w-5 h-5" />
                  Home
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="fixed bottom-6 right-6 flex flex-col gap-3">
          <button
            onClick={() => router.push('/')}
            className="p-4 bg-white/10 backdrop-blur-md rounded-full border border-white/20 text-white hover:bg-white/20 transition-all duration-300 transform hover:scale-110 shadow-2xl"
          >
            <Home className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
}