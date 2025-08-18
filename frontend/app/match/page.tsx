"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  ArrowRight,
  Hash,
  Clock,
  Users,
  Zap,
  Eye,
  Copy,
  ExternalLink,
  Sparkles,
  Trophy,
  Target
} from "lucide-react";

export default function MatchIndexPage() {
  const [id, setId] = useState("");
  const [isVisible, setIsVisible] = useState(false);
  const [isValidFormat, setIsValidFormat] = useState(true);
  const router = useRouter();

  useEffect(() => {
    setIsVisible(true);
  }, []);

  useEffect(() => {
    // Basic validation for match ID format
    if (id.length > 0) {
      const isValid = /^[a-zA-Z0-9-_]+$/.test(id);
      setIsValidFormat(isValid);
    } else {
      setIsValidFormat(true);
    }
  }, [id]);

  const go = (e: React.FormEvent) => {
    e.preventDefault();
    if (!id.trim() || !isValidFormat) return;
    router.push(`/match/${encodeURIComponent(id.trim())}`);
  };

  const copyCurrentUrl = () => {
    if (id.trim()) {
      const url = `${window.location.origin}/match/${encodeURIComponent(id.trim())}`;
      navigator.clipboard.writeText(url);
    }
  };

  const recentMatches = [
    { id: "epic-battle-2024", players: 2, status: "Live", game: "Tic-Tac-Toe" },
    { id: "champion-showdown", players: 2, status: "Finished", game: "Rock-Paper-Scissors" },
    { id: "quick-match-789", players: 2, status: "Live", game: "Tic-Tac-Toe" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-20 left-10 w-64 h-64 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-64 h-64 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse delay-500"></div>
      </div>

      <div className={`relative z-10 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>

        {/* Header */}
        <div className="pt-12 pb-8 text-center">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full animate-pulse">
              <Search className="w-12 h-12 text-white" />
            </div>
          </div>

          <h1 className="text-5xl lg:text-6xl font-black mb-4 bg-gradient-to-r from-white via-blue-200 to-purple-200 bg-clip-text text-transparent leading-tight">
            Match Finder
          </h1>

          <p className="text-xl text-purple-200 max-w-2xl mx-auto leading-relaxed">
            Enter a match ID to spectate live battles or review completed games
          </p>
        </div>

        {/* Main Content */}
        <div className="max-w-2xl mx-auto px-6 pb-12">

          {/* Search Form */}
          <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 border border-white/20 shadow-2xl mb-12">
            <div className="space-y-6">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Hash className={`w-5 h-5 transition-colors ${isValidFormat ? 'text-gray-400' : 'text-red-400'}`} />
                </div>
                <input
                  className={`w-full pl-12 pr-4 py-4 rounded-2xl border-2 bg-white/5 backdrop-blur-sm text-white placeholder-gray-400 text-lg font-medium transition-all duration-300 focus:outline-none focus:scale-105 ${isValidFormat
                      ? 'border-white/30 focus:border-blue-400 focus:ring-4 focus:ring-blue-400/20'
                      : 'border-red-400 focus:border-red-500 focus:ring-4 focus:ring-red-400/20'
                    }`}
                  placeholder="Enter Match ID (e.g., epic-battle-2024)"
                  value={id}
                  onChange={(e) => setId(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      go(e as any);
                    }
                  }}
                />
                {id.trim() && (
                  <button
                    type="button"
                    onClick={copyCurrentUrl}
                    className="absolute inset-y-0 right-16 flex items-center pr-3 text-gray-400 hover:text-white transition-colors"
                  >
                    <Copy className="w-5 h-5" />
                  </button>
                )}
              </div>

              {!isValidFormat && (
                <p className="text-red-400 text-sm flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Match ID can only contain letters, numbers, hyphens, and underscores
                </p>
              )}

              <button
                onClick={go}
                disabled={!id.trim() || !isValidFormat}
                className="w-full py-4 px-8 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold text-lg rounded-2xl hover:from-blue-600 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 disabled:hover:scale-100 shadow-2xl hover:shadow-blue-500/25 flex items-center justify-center gap-3 group"
              >
                <Eye className="w-6 h-6" />
                <span>Open Match</span>
                <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            <div className="mt-6 p-4 bg-white/5 rounded-2xl border border-white/10">
              <div className="flex items-center gap-2 text-sm text-purple-200">
                <Sparkles className="w-4 h-4" />
                <span>Pro tip: You can also navigate directly to</span>
                <code className="px-2 py-1 bg-white/10 rounded text-blue-300 font-mono">/match/[id]</code>
              </div>
            </div>
          </div>

          {/* Quick Access - Recent Matches */}
          <div className="bg-white/5 backdrop-blur-md rounded-3xl p-8 border border-white/10 shadow-xl">
            <div className="flex items-center gap-3 mb-6">
              <Clock className="w-6 h-6 text-purple-400" />
              <h2 className="text-2xl font-bold text-white">Recent Matches</h2>
            </div>

            <div className="space-y-3">
              {recentMatches.map((match, i) => (
                <button
                  key={i}
                  onClick={() => router.push(`/match/${match.id}`)}
                  className="w-full p-4 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 hover:border-white/20 transition-all duration-300 group flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg">
                      <Trophy className="w-5 h-5 text-white" />
                    </div>
                    <div className="text-left">
                      <div className="text-white font-semibold group-hover:text-purple-200 transition-colors">
                        {match.id}
                      </div>
                      <div className="text-sm text-gray-400 flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {match.players} players
                        </span>
                        <span>{match.game}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${match.status === 'Live'
                        ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                        : 'bg-gray-500/20 text-gray-300 border border-gray-500/30'
                      }`}>
                      {match.status === 'Live' && <div className="inline-block w-2 h-2 bg-green-400 rounded-full mr-1 animate-pulse"></div>}
                      {match.status}
                    </span>
                    <ExternalLink className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-6 p-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-2xl border border-blue-500/20">
              <div className="flex items-center gap-2 text-sm text-blue-200">
                <Zap className="w-4 h-4" />
                <span>Live matches update in real-time. Join the action as it happens!</span>
              </div>
            </div>
          </div>

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-4 mt-8">
            {[
              { icon: Eye, title: 'Spectate Live', desc: 'Watch matches in real-time' },
              { icon: Clock, title: 'Match History', desc: 'Review completed games' },
              { icon: Users, title: 'Player Stats', desc: 'See detailed performance' }
            ].map((feature, i) => (
              <div key={i} className="p-6 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 text-center group hover:bg-white/10 transition-all">
                <div className="p-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl w-fit mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-white font-semibold mb-2">{feature.title}</h3>
                <p className="text-purple-200 text-sm">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}