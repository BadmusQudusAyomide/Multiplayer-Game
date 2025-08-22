"use client";
import Link from "next/link";
import { useAuth } from "@/src/store/useAuth";
import { disconnectAllSockets } from "@/src/lib/socket";

export default function PlayIndexPage() {
  const token = useAuth((s) => s.token);
  const setToken = useAuth((s) => s.setToken);
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top-right Auth Header */}
        <div className="flex items-center justify-end py-4">
          {!token ? (
            <div className="flex items-center gap-2">
              <Link href="/login" className="px-3 py-1.5 text-sm rounded-lg border border-slate-300 bg-white hover:bg-slate-50">Login</Link>
              <Link href="/signup" className="px-3 py-1.5 text-sm rounded-lg bg-slate-900 text-white hover:bg-black">Sign up</Link>
            </div>
          ) : (
            <button
              onClick={() => { setToken(null); disconnectAllSockets(); try { localStorage.removeItem('lastMatchId'); } catch {} }}
              className="px-3 py-1.5 text-sm rounded-lg border border-red-300 text-red-700 bg-white hover:bg-red-50"
            >
              Logout
            </button>
          )}
        </div>
        {/* Header Section */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-2xl shadow-lg mb-6">
            <span className="text-4xl">🎮</span>
          </div>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent mb-4">
            Game Hub
          </h1>
          <p className="text-xl text-slate-500 max-w-2xl mx-auto">
            Choose your adventure. Challenge friends or test your skills against our AI.
          </p>
        </div>

        {/* Games Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Tic‑Tac‑Toe Card */}
          <Link
            href="/play/ttt"
            className="group relative overflow-hidden bg-white rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-2"
          >
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 to-cyan-400"></div>
            <div className="p-8">
              <div className="flex items-start justify-between mb-6">
                <div className="w-16 h-16 rounded-xl bg-blue-50 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <span className="text-3xl">⭕️</span>
                </div>
                <div className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                  Popular
                </div>
              </div>

              <h2 className="text-2xl font-bold text-slate-800 mb-3">Tic‑Tac‑Toe</h2>
              <p className="text-slate-500 mb-6">
                The classic 3x3 strategy game. Outsmart your opponent in this battle of Xs and Os.
              </p>

              <div className="flex flex-wrap items-center gap-2 mb-4">
                <span className="px-3 py-1.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">2 Players</span>
                <span className="px-3 py-1.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">Strategy</span>
                <span className="px-3 py-1.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">Classic</span>
              </div>

              <div className="flex items-center justify-between mt-8">
                <div className="flex items-center">
                  <div className="flex -space-x-2">
                    <div className="w-8 h-8 rounded-full bg-blue-500 border-2 border-white"></div>
                    <div className="w-8 h-8 rounded-full bg-slate-400 border-2 border-white"></div>
                  </div>
                  <span className="ml-3 text-sm text-slate-500">2 players online</span>
                </div>
                <span className="inline-flex items-center text-sm font-medium text-blue-600 group-hover:translate-x-1 transition-transform">
                  Play now
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </span>
              </div>
            </div>
          </Link>

          {/* Rock‑Paper‑Scissors Card */}
          <Link
            href="/play/rps"
            className="group relative overflow-hidden bg-white rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-2"
          >
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-rose-500 to-pink-400"></div>
            <div className="p-8">
              <div className="flex items-start justify-between mb-6">
                <div className="w-16 h-16 rounded-xl bg-rose-50 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <span className="text-3xl">✂️</span>
                </div>
                <div className="px-3 py-1 rounded-full text-xs font-medium bg-rose-100 text-rose-700">
                  Quick Play
                </div>
              </div>

              <h2 className="text-2xl font-bold text-slate-800 mb-3">Rock‑Paper‑Scissors</h2>
              <p className="text-slate-500 mb-6">
                The ultimate battle of chance and psychology. Will you outpredict your opponent?
              </p>

              <div className="flex flex-wrap items-center gap-2 mb-4">
                <span className="px-3 py-1.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">2 Players</span>
                <span className="px-3 py-1.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">Luck</span>
                <span className="px-3 py-1.5 rounded-full text-xs font-medium bg-rose-100 text-rose-700">Fast</span>
              </div>

              <div className="flex items-center justify-between mt-8">
                <div className="flex items-center">
                  <div className="flex -space-x-2">
                    <div className="w-8 h-8 rounded-full bg-rose-500 border-2 border-white"></div>
                    <div className="w-8 h-8 rounded-full bg-slate-400 border-2 border-white"></div>
                  </div>
                  <span className="ml-3 text-sm text-slate-500">5 players online</span>
                </div>
                <span className="inline-flex items-center text-sm font-medium text-rose-600 group-hover:translate-x-1 transition-transform">
                  Play now
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </span>
              </div>
            </div>
          </Link>
        </div>
  
        {/* Coming Soon Section */}
        <div className="mt-20 text-center">
          <h2 className="text-2xl font-semibold text-slate-700 mb-4">More games coming soon</h2>
          <p className="text-slate-500">We're constantly adding new games to our collection.</p>
        </div>
      </div>
    </div>
  );
}