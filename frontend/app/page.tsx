"use client";
import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/src/store/useAuth';
import { disconnectAllSockets } from '@/src/lib/socket';
import {
  Trophy,
  Zap,
  Users,
  Brain,
  Gamepad2,
  Target,
  Sparkles,
  Crown,
  Play,
  ChevronRight,
  Star,
  Flame,
  Bot,
  Swords
} from 'lucide-react';

export default function Home() {
  const [game, setGame] = useState<'ttt' | 'rps' | ''>('');
  const [modeOpen, setModeOpen] = useState(false);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const firstActionRef = useRef<HTMLAnchorElement | null>(null);
  const [stats, setStats] = useState<{ activePlayers: number; totalWins: number; avgRating: number }>({ activePlayers: 0, totalWins: 0, avgRating: 1000 });

  const token = useAuth((s) => s.token);
  const setToken = useAuth((s) => s.setToken);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  // Fetch real-time stats for hero section
  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, '');
    if (!base) return;
    fetch(`${base}/stats`)
      .then((r) => r.json())
      .then((data) => {
        if (typeof data?.activePlayers === 'number' && typeof data?.totalWins === 'number' && typeof data?.avgRating === 'number') {
          setStats({ activePlayers: data.activePlayers, totalWins: data.totalWins, avgRating: data.avgRating });
        }
      })
      .catch(() => { /* ignore */ });
  }, []);

  // Close modal on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setModeOpen(false);
    }
    if (modeOpen) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [modeOpen]);

  // Autofocus first action and lock body scroll when modal is open
  useEffect(() => {
    if (modeOpen) {
      // lock scroll
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      // focus first action
      setTimeout(() => firstActionRef.current?.focus(), 0);
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [modeOpen]);

  const games = [
    {
      id: 'ttt',
      name: 'Tic-Tac-Toe',
      emoji: '⭕',
      description: 'Classic strategy in a 3x3 grid',
      difficulty: 'Easy',
      players: '2 Players',
      gradient: 'from-blue-500 via-purple-500 to-pink-500',
      hoverGradient: 'from-blue-600 via-purple-600 to-pink-600',
      icon: Target
    },
    {
      id: 'rps',
      name: 'Rock Paper Scissors',
      emoji: '✂️',
      description: 'Lightning-fast reflex battles',
      difficulty: 'Quick',
      players: '2 Players',
      gradient: 'from-emerald-500 via-teal-500 to-cyan-500',
      hoverGradient: 'from-emerald-600 via-teal-600 to-cyan-600',
      icon: Zap
    }
  ];

  const formatCompact = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return String(n);
  };

  const features = [
    { icon: Users, title: 'Real-time Multiplayer', desc: 'Challenge friends instantly' },
    { icon: Bot, title: 'Smart AI Opponents', desc: 'Practice against advanced bots' },
    { icon: Trophy, title: 'Ranked Leaderboards', desc: 'Climb to the top' },
    { icon: Flame, title: 'Live Matches', desc: 'Always find opponents' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 overflow-hidden relative">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 opacity-20 hidden sm:block">
        <div className="absolute top-20 left-10 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse"></div>
        <div className="absolute top-40 right-10 w-72 h-72 bg-yellow-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse delay-1000"></div>
        <div className="absolute -bottom-32 left-20 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse delay-500"></div>
      </div>

      <div className={`relative z-10 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>

        {/* Header */}
        <header className="flex items-center justify-between p-6 lg:p-8">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl">
              <Gamepad2 className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
                GameArena
              </h1>
              <div className="flex items-center gap-1 text-sm text-purple-300">
                <Sparkles className="w-4 h-4" />
                <span>Multiplayer Champions</span>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            {!token ? (
              <>
                <Link
                  href="/login"
                  className="px-4 py-2 rounded-xl border border-purple-400/30 text-white hover:bg-white/10 transition-all backdrop-blur-sm"
                >
                  Login
                </Link>
                <Link
                  href="/signup"
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold hover:from-emerald-600 hover:to-teal-600 transition-all shadow-lg hover:shadow-emerald-500/25"
                >
                  Sign up
                </Link>
              </>
            ) : (
              <button
                onClick={() => { setToken(null); disconnectAllSockets(); }}
                className="px-4 py-2 rounded-xl border border-red-400/30 text-white hover:bg-red-500/20 transition-all backdrop-blur-sm"
              >
                Logout
              </button>
            )}
          </div>
        </header>

        <div className="px-6 lg:px-8 pb-8">
          {/* Hero Section */}
          <div className="text-center py-10 lg:py-16">
            <div className="flex justify-center mb-6">
              <div className="p-4 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full animate-bounce">
                <Crown className="w-12 h-12 text-white" />
              </div>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black mb-4 bg-gradient-to-r from-white via-purple-200 to-pink-200 bg-clip-text text-transparent leading-tight">
              Play with friends. Anywhere.
            </h1>

            <p className="text-base sm:text-lg text-purple-200 mb-6 max-w-2xl mx-auto leading-relaxed">
              Fast multiplayer games. Simple. Mobile‑first.
            </p>

            {/* Quick Stats (live) */}
            <div className="hidden sm:flex flex-wrap justify-center gap-8 mb-10">
              {[
                { icon: Users, value: formatCompact(stats.activePlayers), label: 'Active Players' },
                { icon: Swords, value: formatCompact(stats.totalWins), label: 'Battles Won' },
                { icon: Star, value: Number.isFinite(stats.avgRating) ? stats.avgRating.toFixed(1) : '—', label: 'Avg Rating' }
              ].map((stat, i) => (
                <div key={i} className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <stat.icon className="w-5 h-5 text-yellow-400" />
                    <span className="text-2xl font-bold text-white">{stat.value}</span>
                  </div>
                  <span className="text-sm text-purple-300">{stat.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Game Selection */}
          <div className="max-w-6xl mx-auto mb-12">
            <div className="text-center mb-6">
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Choose a game</h2>
              <p className="text-purple-200 text-sm sm:text-base">Pick one to start</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
              {games.map((gameItem) => {
                const IconComponent = gameItem.icon;
                return (
                  <button
                    key={gameItem.id}
                    onClick={() => {
                      setGame(gameItem.id as 'ttt' | 'rps');
                      setModeOpen(true);
                    }}
                    onMouseEnter={() => setHoveredCard(gameItem.id)}
                    onMouseLeave={() => setHoveredCard(null)}
                    className={`group relative p-8 rounded-3xl border-2 transition-all duration-500 transform hover:scale-105 ${game === gameItem.id
                        ? `border-white shadow-2xl bg-gradient-to-br ${gameItem.gradient}`
                        : 'border-purple-400/30 bg-white/5 backdrop-blur-sm hover:border-white/50'
                      }`}
                  >
                    <div className="flex items-start justify-between mb-6">
                      <div className="text-left">
                        <div className="text-6xl mb-3">{gameItem.emoji}</div>
                        <h3 className="text-2xl font-bold text-white mb-2">{gameItem.name}</h3>
                        <p className="text-purple-200">{gameItem.description}</p>
                      </div>
                      <IconComponent className="w-8 h-8 text-white/70 group-hover:text-white transition-colors" />
                    </div>

                    <div className="flex justify-between items-center">
                      <div className="flex gap-4">
                        <span className="px-3 py-1 bg-white/20 rounded-full text-sm text-white backdrop-blur-sm">
                          {gameItem.difficulty}
                        </span>
                        <span className="px-3 py-1 bg-white/20 rounded-full text-sm text-white backdrop-blur-sm">
                          {gameItem.players}
                        </span>
                      </div>
                      {game === gameItem.id && (
                        <div className="flex items-center gap-1 text-white font-semibold text-sm">
                          <span>Selected</span>
                          <ChevronRight className="w-5 h-5" />
                        </div>
                      )}
                    </div>

                    {hoveredCard === gameItem.id && (
                      <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mode Selection Modal */}
          {modeOpen && game && (
            <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="mode-title">
              <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={() => setModeOpen(false)}
              />
              <div className="relative z-10 w-full max-w-xl mx-auto p-6 md:p-8 rounded-2xl border border-purple-400/30 bg-gradient-to-br from-slate-900 to-purple-900 shadow-2xl">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 id="mode-title" className="text-2xl font-bold text-white">Choose Mode</h3>
                    <p className="text-purple-200">How do you want to play {game === 'ttt' ? 'Tic‑Tac‑Toe' : 'Rock‑Paper‑Scissors'}?</p>
                  </div>
                  <button
                    aria-label="Close"
                    className="text-purple-200 hover:text-white"
                    onClick={() => setModeOpen(false)}
                  >
                    ✕
                  </button>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <Link
                    href={`/play/${game}?mode=player`}
                    className="group relative p-6 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold hover:from-blue-600 hover:to-purple-700 transition-all duration-300 transform hover:scale-[1.02] shadow-xl hover:shadow-blue-500/25 flex items-center justify-between"
                    onClick={() => setModeOpen(false)}
                    ref={firstActionRef}
                    tabIndex={0}
                  >
                    <div className="text-left">
                      <div className="flex items-center gap-2 mb-1">
                        <Users className="w-6 h-6" />
                        <span>Play vs Player</span>
                      </div>
                      <p className="text-blue-100 text-xs font-normal">Match with real opponents</p>
                    </div>
                    <Play className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                  </Link>

                  <Link
                    href={`/play/${game}?mode=ai`}
                    className="group relative p-6 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold hover:from-emerald-600 hover:to-teal-700 transition-all duration-300 transform hover:scale-[1.02] shadow-xl hover:shadow-emerald-500/25 flex items-center justify-between"
                    onClick={() => setModeOpen(false)}
                  >
                    <div className="text-left">
                      <div className="flex items-center gap-2 mb-1">
                        <Brain className="w-6 h-6" />
                        <span>Play vs AI</span>
                      </div>
                      <p className="text-emerald-100 text-xs font-normal">Practice with smart AI</p>
                    </div>
                    <Play className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>

                {!token && (
                  <div className="mt-6 text-center text-purple-200 text-sm">
                    Not signed in? You can browse, but you'll be asked to login before playing.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Features Grid */}
          <div className="max-w-6xl mx-auto mb-16">
            <div className="text-center mb-12">
              <h3 className="text-3xl font-bold text-white mb-4">Why Champions Choose Us</h3>
              <p className="text-purple-200 text-lg">Experience the ultimate competitive gaming platform</p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((feature, i) => (
                <div
                  key={i}
                  className="p-6 bg-white/5 backdrop-blur-sm rounded-2xl border border-purple-400/20 hover:border-purple-400/50 transition-all duration-300 hover:bg-white/10 group"
                >
                  <div className="p-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl w-fit mb-4 group-hover:scale-110 transition-transform">
                    <feature.icon className="w-6 h-6 text-white" />
                  </div>
                  <h4 className="text-white font-semibold text-lg mb-2">{feature.title}</h4>
                  <p className="text-purple-200 text-sm">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Call to Action */}
          {!token && (
            <div className="text-center bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-sm rounded-3xl p-12 border border-purple-400/30">
              <h3 className="text-4xl font-bold text-white mb-4">Join the Elite</h3>
              <p className="text-purple-200 text-lg mb-8 max-w-2xl mx-auto">
                Create your account today and start your journey from rookie to champion.
                Compete in tournaments, climb leaderboards, and prove you're the best.
              </p>
              <Link
                href="/signup"
                className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-bold text-lg rounded-2xl hover:from-yellow-500 hover:to-orange-600 transition-all duration-300 transform hover:scale-105 shadow-2xl"
              >
                <Crown className="w-6 h-6" />
                Start Your Legend
                <ChevronRight className="w-6 h-6" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}