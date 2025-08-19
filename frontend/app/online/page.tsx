"use client";
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getLobbySocket, lobbyApi, GameType } from '@/src/lib/socket';
import { useAuth } from '@/src/store/useAuth';
import { Users, Wifi, UserCheck, UserX, Gamepad2, Swords, Home } from 'lucide-react';

type PresenceItem = { id: string; username: string; inMatch?: boolean };

type Invite = { from: { id: string; username: string }; gameType: GameType };

enum InviteStatus { Idle = 'idle', Sent = 'sent', Error = 'error' }

export default function OnlinePage() {
  const token = useAuth((s) => s.token);
  const router = useRouter();
  const [online, setOnline] = useState<PresenceItem[]>([]);
  const [selfId, setSelfId] = useState<string | null>(null);
  const [lastInvite, setLastInvite] = useState<Invite | null>(null);
  const [inviteStatus, setInviteStatus] = useState<InviteStatus>(InviteStatus.Idle);

  useEffect(() => {
    if (!token) { router.push('/login'); return; }
    // Connect to lobby
    const s = getLobbySocket(token);

    const onPresenceList = (list: PresenceItem[]) => {
      setOnline(list);
    };
    const onPresenceUpdate = (p: Partial<PresenceItem> & { id: string; online?: boolean }) => {
      setOnline((prev) => {
        const idx = prev.findIndex((x) => x.id === p.id);
        // remove if went offline
        if (p.online === false) {
          if (idx >= 0) {
            const copy = [...prev];
            copy.splice(idx, 1);
            return copy;
          }
          return prev;
        }
        const item: PresenceItem = {
          id: p.id,
          username: (idx >= 0 ? prev[idx].username : (p as any).username) || 'Player',
          inMatch: p.inMatch ?? (idx >= 0 ? prev[idx].inMatch : false),
        };
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = item;
          return copy;
        }
        return [...prev, item];
      });
    };
    const onInviteReceived = (payload: Invite) => {
      setLastInvite(payload);
    };
    const onInviteSent = () => {
      setInviteStatus(InviteStatus.Sent);
      setTimeout(() => setInviteStatus(InviteStatus.Idle), 3000);
    };
    const onInviteError = () => {
      setInviteStatus(InviteStatus.Error);
      setTimeout(() => setInviteStatus(InviteStatus.Idle), 3000);
    };
    const onMatchFound = ({ matchId }: any) => {
      router.push(`/match/${matchId}`);
    };

    // Best-effort self id from token payload isn't available; infer after first presence.list by finding a user without inMatch changes soon.
    // For now we leave selfId null; we will filter by checking socket side later if needed.

    s.on('presence.list', onPresenceList);
    s.on('presence.update', onPresenceUpdate);
    s.on('invite.received', onInviteReceived);
    s.on('invite.sent', onInviteSent);
    s.on('invite.error', onInviteError);
    s.on('match.found', onMatchFound);
    if (s.disconnected) s.connect();

    return () => {
      const ls = getLobbySocket();
      ls?.off('presence.list', onPresenceList);
      ls?.off('presence.update', onPresenceUpdate);
      ls?.off('invite.received', onInviteReceived);
      ls?.off('invite.sent', onInviteSent);
      ls?.off('invite.error', onInviteError);
      ls?.off('match.found', onMatchFound);
    };
  }, [token, router]);

  const invite = (toUserId: string, gameType: GameType) => {
    if (!token) return;
    setInviteStatus(InviteStatus.Idle);
    lobbyApi.inviteSend(toUserId, gameType, token);
  };

  const acceptInvite = (fromUserId: string, gameType: GameType) => {
    if (!token) return;
    lobbyApi.inviteAccept(fromUserId, gameType, token);
    setLastInvite(null);
  };

  const filtered = useMemo(() => online.filter((u) => u.id !== selfId), [online, selfId]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="relative z-10 p-6 lg:p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl">
              <Users className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">Online Players</h1>
              <div className="flex items-center gap-2 text-sm text-gray-300 mt-1">
                <Wifi className="w-4 h-4 text-green-400" /> Connected
              </div>
            </div>
          </div>
          <button onClick={() => router.push('/')} className="px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-white hover:bg-white/20 flex items-center gap-2">
            <Home className="w-4 h-4" /> Home
          </button>
        </div>

        {/* Invite toast */}
        {lastInvite && (
          <div className="mb-4 p-4 bg-white/10 border border-white/20 rounded-2xl text-white flex items-center justify-between">
            <div>
              <div className="font-semibold">Challenge received</div>
              <div className="text-sm text-purple-200">{lastInvite.from.username} invited you to play {lastInvite.gameType.toUpperCase()}</div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => acceptInvite(lastInvite.from.id, lastInvite.gameType)} className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600">Accept</button>
              <button onClick={() => setLastInvite(null)} className="px-4 py-2 rounded-xl bg-white/10 border border-white/20">Ignore</button>
            </div>
          </div>
        )}

        {inviteStatus !== InviteStatus.Idle && (
          <div className={`mb-4 p-3 rounded-xl text-white ${inviteStatus === InviteStatus.Sent ? 'bg-emerald-600/30 border border-emerald-400/40' : 'bg-rose-600/30 border border-rose-400/40'}`}>
            {inviteStatus === InviteStatus.Sent ? 'Invite sent' : 'Invite error'}
          </div>
        )}

        {/* List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((u) => (
            <div key={u.id} className="p-4 bg-white/10 rounded-2xl border border-white/20 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${u.inMatch ? 'bg-yellow-500/20' : 'bg-green-500/20'}`}>{u.inMatch ? <UserX className="w-5 h-5 text-yellow-300"/> : <UserCheck className="w-5 h-5 text-emerald-300"/>}</div>
                <div>
                  <div className="font-semibold">{u.username}</div>
                  <div className="text-sm text-gray-300">{u.inMatch ? 'In a match' : 'Available'}</div>
                </div>
              </div>
              <div className="flex gap-2">
                <button disabled={!!u.inMatch} onClick={() => invite(u.id, 'ttt')} className={`px-3 py-2 rounded-xl border ${u.inMatch ? 'bg-gray-500/20 border-white/10 text-gray-300 cursor-not-allowed' : 'bg-white/10 border-white/20 hover:bg-white/20'}`}>
                  <Swords className="w-4 h-4 inline mr-1"/> TTT
                </button>
                <button disabled={!!u.inMatch} onClick={() => invite(u.id, 'rps')} className={`px-3 py-2 rounded-xl border ${u.inMatch ? 'bg-gray-500/20 border-white/10 text-gray-300 cursor-not-allowed' : 'bg-white/10 border-white/20 hover:bg-white/20'}`}>
                  <Gamepad2 className="w-4 h-4 inline mr-1"/> RPS
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
