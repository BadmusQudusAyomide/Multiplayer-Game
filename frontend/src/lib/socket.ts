"use client";
import { io, Socket } from 'socket.io-client';

function normalizeProtocol(url: string) {
  try {
    // If the app is served over HTTPS but the URL is HTTP, upgrade to HTTPS to avoid mixed content
    if (typeof window !== 'undefined' && window.location?.protocol === 'https:' && url.startsWith('http://')) {
      return url.replace(/^http:\/\//, 'https://');
    }
  } catch {}
  return url;
}

function socketBaseUrl() {
  const a = process.env.NEXT_PUBLIC_SOCKET_URL;
  const b = process.env.NEXT_PUBLIC_API_BASE_URL;
  const raw = (a || b || 'http://localhost:4000') as string;
  return normalizeProtocol(raw);
}

let lobbySocket: Socket | null = null;
let chatSocket: Socket | null = null;
let matchSocket: Socket | null = null;

const FORCE_POLLING = process.env.NEXT_PUBLIC_FORCE_POLLING === '1' || process.env.NEXT_PUBLIC_FORCE_POLLING === 'true';

export function getLobbySocket(token?: string) {
  if (!lobbySocket) {
    const base = socketBaseUrl();
    const transports = FORCE_POLLING ? ['polling'] : ['websocket', 'polling'];
    lobbySocket = io(base + '/lobby', {
      // We pass JWT via Socket.IO auth payload; cookies are not needed
      withCredentials: false,
      auth: token ? { token } : undefined,
      autoConnect: !!token,
      // Prefer WebSocket; allow polling as fallback only if WS is blocked
      transports,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 500,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });
    lobbySocket.on('connect_error', (err) => {
      console.error('lobby socket connect_error', err?.message || err, {
        base,
        ns: '/lobby',
        transports,
      });
    });
  } else if (token) {
    // If token provided later, update auth and reconnect if needed
    lobbySocket.auth = { token } as any;
    if (lobbySocket.disconnected) lobbySocket.connect();
  }
  return lobbySocket;
}

export function getChatSocket(token?: string) {
  if (!chatSocket) {
    const base = socketBaseUrl();
    const transports = FORCE_POLLING ? ['polling'] : ['polling', 'websocket'];
    chatSocket = io(base + '/chat', {
      withCredentials: true,
      auth: token ? { token } : undefined,
      autoConnect: !!token,
      transports,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 500,
      reconnectionDelayMax: 5000,
      timeout: 10000,
    });
    chatSocket.on('connect_error', (err) => {
      console.error('chat socket connect_error', err?.message || err, {
        base,
        ns: '/chat',
        transports,
      });
    });
  } else if (token) {
    chatSocket.auth = { token } as any;
    if (chatSocket.disconnected) chatSocket.connect();
  }
  return chatSocket;
}

export type GameType = 'ttt' | 'rps';

export const lobbyApi = {
  joinQueue: (gameType: GameType, token: string) => {
    const s = getLobbySocket(token);
    if (s.connected) {
      s.emit('queue.join', { gameType });
    } else {
      s.once('connect', () => s.emit('queue.join', { gameType }));
      if (s.disconnected) s.connect();
    }
  },
  leaveQueue: (gameType: GameType, token: string) => {
    const s = getLobbySocket(token);
    if (s.connected) {
      s.emit('queue.leave', { gameType });
    } else {
      s.once('connect', () => s.emit('queue.leave', { gameType }));
      if (s.disconnected) s.connect();
    }
  },
  acceptAi: (gameType: GameType, token: string, difficulty: 'easy' | 'medium' | 'hard' = 'medium') => {
    const s = getLobbySocket(token);
    if (s.connected) {
      s.emit('ai.accept', { gameType, difficulty });
    } else {
      s.once('connect', () => s.emit('ai.accept', { gameType, difficulty }));
      if (s.disconnected) s.connect();
    }
  },
  inviteSend: (toUserId: string, gameType: GameType, token: string) => {
    const s = getLobbySocket(token);
    if (s.connected) {
      s.emit('invite.send', { toUserId, gameType });
    } else {
      s.once('connect', () => s.emit('invite.send', { toUserId, gameType }));
      if (s.disconnected) s.connect();
    }
  },
  inviteAccept: (fromUserId: string, gameType: GameType, token: string) => {
    const s = getLobbySocket(token);
    if (s.connected) {
      s.emit('invite.accept', { fromUserId, gameType });
    } else {
      s.once('connect', () => s.emit('invite.accept', { fromUserId, gameType }));
      if (s.disconnected) s.connect();
    }
  },
};

export function getMatchSocket(token?: string) {
  if (!matchSocket) {
    const base = socketBaseUrl();
    const transports = FORCE_POLLING ? ['polling'] : ['websocket', 'polling'];
    matchSocket = io(base + '/match', {
      withCredentials: false,
      auth: token ? { token } : undefined,
      autoConnect: !!token,
      transports,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 500,
      reconnectionDelayMax: 5000,
      timeout: 10000,
    });
    matchSocket.on('connect_error', (err) => {
      console.error('match socket connect_error', err?.message || err, {
        base,
        ns: '/match',
        transports,
      });
    });
  } else if (token) {
    matchSocket.auth = { token } as any;
    if (matchSocket.disconnected) matchSocket.connect();
  }
  return matchSocket;
}

export const matchApi = {
  join: (matchId: string, token: string) => {
    const s = getMatchSocket(token);
    if (s.connected) {
      s.emit('match.join', { matchId });
    } else {
      s.once('connect', () => s.emit('match.join', { matchId }));
      if (s.disconnected) s.connect();
    }
    return s;
  },
  ready: (matchId: string, token: string) => {
    const s = getMatchSocket(token);
    if (s.connected) {
      s.emit('player.ready', { matchId });
    } else {
      s.once('connect', () => s.emit('player.ready', { matchId }));
      if (s.disconnected) s.connect();
    }
  },
  quit: (matchId: string, token: string) => {
    const s = getMatchSocket(token);
    if (s.connected) {
      s.emit('match.quit', { matchId });
    } else {
      s.once('connect', () => s.emit('match.quit', { matchId }));
      if (s.disconnected) s.connect();
    }
  },
  moveTtt: (matchId: string, cellIdx: number, token: string) => {
    const s = getMatchSocket(token);
    if (s.connected) {
      s.emit('move.submit', { matchId, payload: { cellIdx } });
    } else {
      s.once('connect', () => s.emit('move.submit', { matchId, payload: { cellIdx } }));
      if (s.disconnected) s.connect();
    }
  },
  moveRps: (matchId: string, choice: 'rock'|'paper'|'scissors', token: string) => {
    const s = getMatchSocket(token);
    if (s.connected) {
      s.emit('move.submit', { matchId, payload: { choice } });
    } else {
      s.once('connect', () => s.emit('move.submit', { matchId, payload: { choice } }));
      if (s.disconnected) s.connect();
    }
  },
  rematch: (matchId: string, token: string) => {
    const s = getMatchSocket(token);
    if (s.connected) {
      s.emit('rematch.request', { matchId });
    } else {
      s.once('connect', () => s.emit('rematch.request', { matchId }));
      if (s.disconnected) s.connect();
    }
  },
};

export function updateAllSocketAuth(token: string) {
  if (lobbySocket) {
    lobbySocket.auth = { token } as any;
    if (lobbySocket.disconnected) lobbySocket.connect();
  }
  if (chatSocket) {
    chatSocket.auth = { token } as any;
    if (chatSocket.disconnected) chatSocket.connect();
  }
  if (matchSocket) {
    matchSocket.auth = { token } as any;
    if (matchSocket.disconnected) matchSocket.connect();
  }
}

export function disconnectAllSockets() {
  lobbySocket?.disconnect();
  chatSocket?.disconnect();
  matchSocket?.disconnect();
}

// Disconnect only the match namespace socket
export function disconnectMatchSocket() {
  try {
    matchSocket?.disconnect();
  } catch (e) {
    // no-op
  }
}
