import 'dotenv/config';
import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { Server as SocketIOServer } from 'socket.io';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from './models/User.js';
import { Match } from './models/Match.js';

const PORT = process.env.PORT || 4000;
const CORS_ORIGIN = (process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((s) => s.trim()).filter(Boolean)
  : ['http://localhost:3000']
);
const MONGODB_URI = process.env.MONGODB_URI;
const JWT_SECRET = process.env.JWT_SECRET || 'change_me_access';

if (!MONGODB_URI) {
  console.error('Missing MONGODB_URI in environment');
  process.exit(1);
}

// Express app
const app = express();
app.use(helmet());
app.use(cors({ origin: CORS_ORIGIN, credentials: true }));
app.use(express.json());
app.use(cookieParser());

// Health route
app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'backend', time: new Date().toISOString() });
});

// Global stats endpoint for homepage hero
app.get('/stats', async (_req, res) => {
  try {
    // Active players: unique userIds connected to match namespace
    const sockets = await matchNs.fetchSockets();
    const activeSet = new Set();
    sockets.forEach((s) => {
      const uid = s.data?.user?.userId;
      if (uid) activeSet.add(uid.toString());
    });
    const activePlayers = activeSet.size;

    // Aggregate wins and rating from Users
    const users = await User.find({}, {
      statsTTT: 1,
      statsRPS: 1,
      _id: 0,
    }).lean();

    let totalWins = 0;
    let ratingSum = 0;
    let ratingCount = 0;
    for (const u of users) {
      const ttt = u.statsTTT || {};
      const rps = u.statsRPS || {};
      totalWins += (ttt.wins || 0) + (rps.wins || 0);
      const tttElo = ttt.elo ?? 1000;
      const rpsElo = rps.elo ?? 1000;
      ratingSum += (tttElo + rpsElo) / 2;
      ratingCount += 1;
    }
    const avgRating = ratingCount ? Math.round((ratingSum / ratingCount) * 10) / 10 : 1000;

    res.json({ activePlayers, totalWins, avgRating });
  } catch (e) {
    console.error('stats error', e);
    res.status(500).json({ message: 'Server error' });
  }
});

// Auth routes
app.post('/auth/signup', async (req, res) => {
  try {
    const { email, username, password } = req.body || {};
    if (!email || !username || !password) return res.status(400).json({ message: 'Missing fields' });
    const existing = await User.findOne({ $or: [{ email }, { username }] });
    if (existing) return res.status(409).json({ message: 'User exists' });
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ email, username, passwordHash });
    const token = jwt.sign({ sub: user._id.toString(), username: user.username }, JWT_SECRET, { expiresIn: '2h' });
    return res.status(201).json({ token, user: { id: user._id, email: user.email, username: user.username } });
  } catch (e) {
    console.error('signup error', e);
    return res.status(500).json({ message: 'Server error' });
  }
});

app.post('/auth/login', async (req, res) => {
  try {
    const { email, username, password } = req.body || {};
    let user = null;
    if (email && username) {
      user = await User.findOne({ $or: [{ email }, { username }] });
    } else if (email) {
      user = await User.findOne({ email });
    } else if (username) {
      user = await User.findOne({ username });
    }
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });
    const ok = await bcrypt.compare(password || '', user.passwordHash);
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' });
    const token = jwt.sign({ sub: user._id.toString(), username: user.username }, JWT_SECRET, { expiresIn: '2h' });
    return res.json({ token, user: { id: user._id, email: user.email, username: user.username } });
  } catch (e) {
    console.error('login error', e);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Leaderboard route
app.get('/leaderboard', async (req, res) => {
  try {
    const game = (req.query.game === 'rps') ? 'rps' : 'ttt';
    const sortKey = (req.query.sort === 'wins') ? 'wins' : 'elo';
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const field = game === 'ttt' ? 'statsTTT' : 'statsRPS';
    const projection = {
      username: 1,
      email: 1,
      [`${field}.wins`]: 1,
      [`${field}.losses`]: 1,
      [`${field}.draws`]: 1,
      [`${field}.elo`]: 1,
      [`${field}.gamesPlayed`]: 1,
    };
    const sort = { [`${field}.${sortKey}`]: -1, [`${field}.gamesPlayed`]: -1, username: 1 };
    const users = await User.find({}, projection).sort(sort).limit(limit).lean();
    const rows = users.map((u) => ({
      username: u.username,
      email: u.email,
      wins: u[field]?.wins || 0,
      losses: u[field]?.losses || 0,
      draws: u[field]?.draws || 0,
      elo: u[field]?.elo || 1000,
      gamesPlayed: u[field]?.gamesPlayed || 0,
    }));
    res.json({ game, sort: sortKey, rows });
  } catch (e) {
    console.error('leaderboard error', e);
    res.status(500).json({ message: 'Server error' });
  }
});

// HTTP + Socket.IO server
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: { origin: CORS_ORIGIN, credentials: true },
});

// Namespaces
const lobbyNs = io.of('/lobby');
const chatNs = io.of('/chat');
const matchNs = io.of('/match');

// In-memory matchmaking queues per gameType
const QUEUE_TIMEOUT_MS = 12000;
const queues = {
  ttt: [],
  rps: [],
};
// Track timeouts to suggest AI
const joinTimeouts = new Map(); // socketId -> timeoutId
// Presence: userId -> { username, inMatch: boolean, socketId }
const onlineUsers = new Map();

function socketUser(socket) {
  try {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) return null;
    const decoded = jwt.verify(token, JWT_SECRET);
    return { userId: decoded.sub, username: decoded.username };
  } catch {
    return null;
  }
}

async function createHumanMatch(gameType, a, b) {
  const match = await Match.create({ gameType, status: 'active', players: [a.userId, b.userId], playedVs: 'human' });
  const room = `match:${match._id.toString()}`;
  a.socket.join(room);
  b.socket.join(room);
  lobbyNs.to(a.socket.id).emit('match.found', { matchId: match._id, room });
  lobbyNs.to(b.socket.id).emit('match.found', { matchId: match._id, room });
}

async function createAiMatch(gameType, player, difficulty = 'medium') {
  const match = await Match.create({ gameType, status: 'active', players: [player.userId], playedVs: 'ai' });
  const room = `match:${match._id.toString()}`;
  player.socket.join(room);
  // store difficulty for this match
  aiDifficulty.set(match._id.toString(), ['easy','medium','hard'].includes(difficulty) ? difficulty : 'medium');
  lobbyNs.to(player.socket.id).emit('match.found', { matchId: match._id, room, vs: 'ai' });
}

lobbyNs.on('connection', (socket) => {
  console.log('lobby connected', socket.id);
  const auth = socketUser(socket);
  if (auth) {
    // Add/update presence
    onlineUsers.set(auth.userId, { username: auth.username, inMatch: false, socketId: socket.id });
    // Send current list to this user
    const list = Array.from(onlineUsers.entries()).map(([id, v]) => ({ id, username: v.username, inMatch: v.inMatch }));
    socket.emit('presence.list', list);
    // Broadcast update
    socket.broadcast.emit('presence.update', { id: auth.userId, username: auth.username, inMatch: false, online: true });
  }

  socket.on('queue.join', ({ gameType }) => {
    if (!auth) return socket.emit('error', { message: 'unauthorized' });
    if (!['ttt', 'rps'].includes(gameType)) return;
    // Avoid duplicates
    queues[gameType] = queues[gameType].filter((q) => q.userId !== auth.userId);
    const entry = { userId: auth.userId, socket, ts: Date.now() };
    queues[gameType].push(entry);

    // Try to match if at least 2
    if (queues[gameType].length >= 2) {
      const a = queues[gameType].shift();
      const b = queues[gameType].shift();
      if (a && b) {
        createHumanMatch(gameType, a, b).catch(console.error);
      }
      return;
    }

    // Schedule AI suggestion after timeout
    const t = setTimeout(() => {
      if (queues[gameType].some((q) => q.userId === auth.userId)) {
        socket.emit('suggest.ai', { gameType });
      }
    }, QUEUE_TIMEOUT_MS);
    joinTimeouts.set(socket.id, t);
  });

  // (moved) rematch.request is handled in match namespace


  socket.on('queue.leave', ({ gameType }) => {
    if (!auth) return;
    if (!['ttt', 'rps'].includes(gameType)) return;
    queues[gameType] = queues[gameType].filter((q) => q.userId !== auth.userId);
    const t = joinTimeouts.get(socket.id);
    if (t) clearTimeout(t);
  });

  socket.on('ai.accept', ({ gameType, difficulty }) => {
    if (!auth) return;
    if (!['ttt', 'rps'].includes(gameType)) return;
    // Remove from queue if still there
    queues[gameType] = queues[gameType].filter((q) => q.userId !== auth.userId);
    const t = joinTimeouts.get(socket.id);
    if (t) clearTimeout(t);
    createAiMatch(gameType, { userId: auth.userId, socket }, difficulty).catch(console.error);
  });

  socket.on('disconnect', () => {
    // Cleanup from all queues
    Object.keys(queues).forEach((g) => {
      queues[g] = queues[g].filter((q) => q.socket.id !== socket.id);
    });
    const t = joinTimeouts.get(socket.id);
    if (t) clearTimeout(t);
    joinTimeouts.delete(socket.id);
    // Remove presence if matches socket
    if (auth) {
      const cur = onlineUsers.get(auth.userId);
      if (cur && cur.socketId === socket.id) {
        onlineUsers.delete(auth.userId);
        socket.broadcast.emit('presence.update', { id: auth.userId, online: false });
      }
    }
    console.log('lobby disconnected', socket.id);
  });
});

chatNs.on('connection', (socket) => {
  console.log('chat connected', socket.id);
  socket.on('chat.message', (payload) => {
    const { room, text, user } = payload || {};
    if (!room || !text) return;
    socket.to(room).emit('chat.message', { text, user, ts: Date.now() });
  });
});

// ==================== MATCH NAMESPACE ====================
// In-memory match state: matchId -> state
// For persistence beyond runtime, consider storing snapshots in Mongo.
const matches = new Map();
// Track rematch requests: matchId -> Set(userId)
const rematchRequests = new Map();
// Track AI difficulty per matchId: 'easy' | 'medium' | 'hard'
const aiDifficulty = new Map();

function tttCheckWinner(board) {
  const lines = [
    [0,1,2],[3,4,5],[6,7,8],
    [0,3,6],[1,4,7],[2,5,8],
    [0,4,8],[2,4,6]
  ];
  for (const [a,b,c] of lines) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
  }
  if (board.every(Boolean)) return 'draw';
  return null;
}

function tttAiMove(board, aiMark, humanMark, randomChance = 0.35) {
  const lines = [
    [0,1,2],[3,4,5],[6,7,8],
    [0,3,6],[1,4,7],[2,5,8],
    [0,4,8],[2,4,6]
  ];

  const empty = board
    .map((v, i) => (v === null ? i : -1))
    .filter((i) => i >= 0);

  // Difficulty-based randomness to be less perfect
  if (empty.length && Math.random() < randomChance) {
    return empty[Math.floor(Math.random() * empty.length)];
  }

  // Try to win
  for (const [a,b,c] of lines) {
    const line = [board[a], board[b], board[c]];
    if (line.filter(v => v===aiMark).length===2 && line.includes(null)) {
      const idx = [a,b,c][line.indexOf(null)];
      return idx;
    }
  }
  // Block human
  for (const [a,b,c] of lines) {
    const line = [board[a], board[b], board[c]];
    if (line.filter(v => v===humanMark).length===2 && line.includes(null)) {
      const idx = [a,b,c][line.indexOf(null)];
      return idx;
    }
  }
  // Center
  if (board[4] === null) return 4;
  // Corners
  const corners = [0,2,6,8].filter(i => board[i]===null);
  if (corners.length) return corners[Math.floor(Math.random()*corners.length)];
  // Sides
  const sides = [1,3,5,7].filter(i => board[i]===null);
  if (sides.length) return sides[Math.floor(Math.random()*sides.length)];
  return -1;
}

function rpsWinner(a, b) {
  if (a === b) return 'draw';
  if ((a==='rock'&&b==='scissors')||(a==='paper'&&b==='rock')||(a==='scissors'&&b==='paper')) return 'a';
  return 'b';
}

async function finalizeMatch(matchId, winnerUserId = null) {
  try {
    const match = await Match.findById(matchId);
    if (!match || match.status === 'finished') return;
    match.status = 'finished';
    match.winnerUserId = winnerUserId || undefined;
    await match.save();
    // Update stats
    if (match.playedVs === 'human' && match.players.length === 2) {
      const [u1, u2] = match.players;
      const winner = winnerUserId?.toString();
      const updates = [];
      const field = match.gameType === 'ttt' ? 'statsTTT' : 'statsRPS';
      // Load current ELOs (default 1000)
      const [u1Doc, u2Doc] = await Promise.all([
        User.findById(u1).lean(),
        User.findById(u2).lean(),
      ]);
      const ra = u1Doc?.[field]?.elo ?? 1000;
      const rb = u2Doc?.[field]?.elo ?? 1000;
      const K = 32;
      const Ea = 1 / (1 + Math.pow(10, (rb - ra) / 400));
      const Eb = 1 - Ea;
      let Sa = 0.5, Sb = 0.5;
      if (winner && winner === u1.toString()) { Sa = 1; Sb = 0; }
      else if (winner && winner === u2.toString()) { Sa = 0; Sb = 1; }
      const newRa = Math.round(ra + K * (Sa - Ea));
      const newRb = Math.round(rb + K * (Sb - Eb));

      if (winner && winner === u1.toString()) {
        updates.push(User.updateOne(
          { _id: u1 },
          { $inc: { [`${field}.wins`]: 1, [`${field}.gamesPlayed`]: 1 }, $set: { [`${field}.elo`]: newRa } }
        ));
        updates.push(User.updateOne(
          { _id: u2 },
          { $inc: { [`${field}.losses`]: 1, [`${field}.gamesPlayed`]: 1 }, $set: { [`${field}.elo`]: newRb } }
        ));
      } else if (winner && winner === u2.toString()) {
        updates.push(User.updateOne(
          { _id: u2 },
          { $inc: { [`${field}.wins`]: 1, [`${field}.gamesPlayed`]: 1 }, $set: { [`${field}.elo`]: newRb } }
        ));
        updates.push(User.updateOne(
          { _id: u1 },
          { $inc: { [`${field}.losses`]: 1, [`${field}.gamesPlayed`]: 1 }, $set: { [`${field}.elo`]: newRa } }
        ));
      } else {
        updates.push(User.updateOne(
          { _id: u1 },
          { $inc: { [`${field}.draws`]: 1, [`${field}.gamesPlayed`]: 1 }, $set: { [`${field}.elo`]: newRa } }
        ));
        updates.push(User.updateOne(
          { _id: u2 },
          { $inc: { [`${field}.draws`]: 1, [`${field}.gamesPlayed`]: 1 }, $set: { [`${field}.elo`]: newRb } }
        ));
      }
      await Promise.all(updates);
    } else if (match.playedVs === 'ai') {
      const userId = match.players[0];
      const field = match.gameType === 'ttt' ? 'statsTTT' : 'statsRPS';
      // Fetch current player ELO
      const uDoc = await User.findById(userId).lean();
      const ra = uDoc?.[field]?.elo ?? 1000;
      const rb = 1000; // fixed AI rating baseline
      const K = 24; // smaller K vs AI to reduce volatility
      const Ea = 1 / (1 + Math.pow(10, (rb - ra) / 400));
      let Sa = 0.5;
      if (winnerUserId && winnerUserId.toString() === userId.toString()) Sa = 1; // user win
      else if (winnerUserId) Sa = 0; // AI win
      const newRa = Math.round(ra + K * (Sa - Ea));

      if (winnerUserId && winnerUserId.toString() === userId.toString()) {
        await User.updateOne(
          { _id: userId },
          { $inc: { [`${field}.wins`]: 1, [`${field}.gamesPlayed`]: 1 }, $set: { [`${field}.elo`]: newRa } }
        );
      } else if (winnerUserId) {
        await User.updateOne(
          { _id: userId },
          { $inc: { [`${field}.losses`]: 1, [`${field}.gamesPlayed`]: 1 }, $set: { [`${field}.elo`]: newRa } }
        );
      } else {
        await User.updateOne(
          { _id: userId },
          { $inc: { [`${field}.draws`]: 1, [`${field}.gamesPlayed`]: 1 }, $set: { [`${field}.elo`]: newRa } }
        );
      }
    }
  } catch (e) {
    console.error('finalizeMatch error', e);
  }
}

matchNs.use((socket, next) => {
  const auth = socketUser(socket);
  if (!auth) return next(new Error('unauthorized'));
  socket.data.user = auth; // { userId, username }
  next();
});

matchNs.on('connection', (socket) => {
  const { userId } = socket.data.user;
  console.log('match connected', socket.id, userId);
  // Mark as in match and notify lobby listeners
  const p = onlineUsers.get(userId);
  if (p) {
    p.inMatch = true;
    onlineUsers.set(userId, p);
    lobbyNs.emit('presence.update', { id: userId, inMatch: true });
  }

  async function emitStateForAll(matchId, room) {
    const state = matches.get(matchId);
    if (!state) return;
    // Build playersInfo with usernames
    let playersInfo = [];
    try {
      if (state.playedVs === 'human' && state.players.length === 2) {
        const [u1, u2] = state.players;
        const [a, b] = await Promise.all([
          User.findById(u1, { username: 1 }).lean(),
          User.findById(u2, { username: 1 }).lean(),
        ]);
        playersInfo = [
          { id: u1, username: a?.username || 'Player 1' },
          { id: u2, username: b?.username || 'Player 2' },
        ];
      } else {
        const u1 = state.players[0];
        const a = await User.findById(u1, { username: 1 }).lean();
        playersInfo = [
          { id: u1, username: a?.username || 'You' },
          { id: 'AI', username: 'AI' },
        ];
      }
    } catch {}

    const sockets = await matchNs.in(room).fetchSockets();
    sockets.forEach((s) => {
      const uid = s.data?.user?.userId;
      const seat = state.players[0] === uid ? 0 : 1;
      matchNs.to(s.id).emit('state.update', { ...state, seat, matchId, playersInfo });
    });
  }

  socket.on('match.join', async ({ matchId }) => {
    try {
      const match = await Match.findById(matchId);
      if (!match) return socket.emit('error', { message: 'match not found' });
      const room = `match:${matchId}`;
      const isParticipant = match.players.some((p) => p.toString() === userId);
      if (!isParticipant && match.playedVs !== 'ai') return socket.emit('error', { message: 'not a participant' });
      socket.join(room);

      // Initialize in-memory state if needed
      if (!matches.has(matchId)) {
        if (match.gameType === 'ttt') {
          matches.set(matchId, {
            gameType: 'ttt',
            playedVs: match.playedVs,
            board: Array(9).fill(null),
            turn: 0, // 0 -> X (players[0]), 1 -> O (players[1] or AI)
            players: match.players.map((p) => p.toString()),
            difficulty: aiDifficulty.get(matchId) || 'medium',
          });
        } else {
          matches.set(matchId, {
            gameType: 'rps',
            playedVs: match.playedVs,
            choices: {}, // userId -> 'rock'|'paper'|'scissors'
            players: match.players.map((p) => p.toString()),
            difficulty: aiDifficulty.get(matchId) || 'medium',
          });
        }
      }

      const state = matches.get(matchId);
      const seat = state.players[0] === userId ? 0 : 1;
      // Build playersInfo for initial emit
      let playersInfo = [];
      try {
        if (state.playedVs === 'human' && state.players.length === 2) {
          const [u1, u2] = state.players;
          const [a, b] = await Promise.all([
            User.findById(u1, { username: 1 }).lean(),
            User.findById(u2, { username: 1 }).lean(),
          ]);
          playersInfo = [
            { id: u1, username: a?.username || 'Player 1' },
            { id: u2, username: b?.username || 'Player 2' },
          ];
        } else {
          const u1 = state.players[0];
          const a = await User.findById(u1, { username: 1 }).lean();
          playersInfo = [
            { id: u1, username: a?.username || 'You' },
            { id: 'AI', username: 'AI' },
          ];
        }
      } catch {}
      matchNs.to(socket.id).emit('state.update', { ...state, seat, matchId, playersInfo });
    } catch (e) {
      console.error('match.join error', e);
    }
  });

  socket.on('move.submit', async ({ matchId, payload }) => {
    try {
      const room = `match:${matchId}`;
      const match = await Match.findById(matchId);
      if (!match) return;
      const state = matches.get(matchId);
      if (!state) return;
      const isP0 = state.players[0] === userId;
      const isP1 = state.players[1] === userId;

      if (state.gameType === 'ttt') {
        const mark = isP0 ? 'X' : 'O';
        const expectedTurn = isP0 ? 0 : 1;
        const idx = payload?.cellIdx;
        if (typeof idx !== 'number' || idx < 0 || idx > 8) return;
        if (state.turn !== expectedTurn) return matchNs.to(socket.id).emit('move.rejected', { reason: 'not your turn' });
        if (state.board[idx] !== null) return matchNs.to(socket.id).emit('move.rejected', { reason: 'occupied' });
        state.board[idx] = mark;
        state.turn = 1 - state.turn;
        await emitStateForAll(matchId, room);
        const result = tttCheckWinner(state.board);
        if (result) {
          let winner = null;
          if (result === 'X') winner = match.players[0];
          else if (result === 'O') winner = match.players[1];
          else winner = null; // draw
          await finalizeMatch(matchId, winner);
          matchNs.to(room).emit('match.end', { winner: winner?.toString() || null, result });
          return;
        }

        // If vs AI and after human move, let AI move if it's AI's turn
        if (match.playedVs === 'ai') {
          const aiSeat = state.players[1] ? 1 : 1; // AI is seat 1 (O)
          if (state.turn === aiSeat) {
            // Map difficulty to random chance
            const diff = aiDifficulty.get(matchId) || state.difficulty || 'medium';
            const randMap = { easy: 0.7, medium: 0.35, hard: 0.1 };
            const randomChance = randMap[diff] ?? 0.35;
            const aiIdx = tttAiMove(state.board, 'O', 'X', randomChance);
            if (aiIdx >= 0) {
              state.board[aiIdx] = 'O';
              state.turn = 1 - state.turn;
              await emitStateForAll(matchId, room);
              const result2 = tttCheckWinner(state.board);
              if (result2) {
                let winner = null;
                if (result2 === 'X') winner = match.players[0];
                else if (result2 === 'O') winner = 'AI'; // AI wins
                else winner = null; // draw
                await finalizeMatch(matchId, winner);
                matchNs.to(room).emit('match.end', { winner: winner?.toString() || null, result: result2 });
              }
            }
          }
        }
      } else if (state.gameType === 'rps') {
        const choice = payload?.choice;
        if (!['rock','paper','scissors'].includes(choice)) return;
        state.choices[userId] = choice;
        await emitStateForAll(matchId, room);

        if (match.playedVs === 'ai') {
          // AI chooses immediately
          const options = ['rock','paper','scissors'];
          const aiChoice = options[Math.floor(Math.random()*3)];
          state.choices['AI'] = aiChoice;
          const userChoice = state.choices[userId];
          const res = rpsWinner(userChoice, aiChoice);
          let winner = null;
          if (res === 'a') winner = match.players[0];
          else if (res === 'b') winner = 'AI'; // AI wins
          await finalizeMatch(matchId, winner);
          matchNs.to(room).emit('match.end', { winner: winner?.toString() || null, result: res, aiChoice });
        } else {
          // Wait for both players
          const haveBoth = state.players.every((pid) => state.choices[pid]);
          if (haveBoth) {
            const c0 = state.choices[state.players[0]];
            const c1 = state.choices[state.players[1]];
            const res = rpsWinner(c0, c1);
            let winner = null;
            if (res === 'a') winner = match.players[0];
            else if (res === 'b') winner = match.players[1];
            await finalizeMatch(matchId, winner);
            matchNs.to(room).emit('match.end', { winner: winner?.toString() || null, result: res, choices: { c0, c1 } });
          }
        }
      }
    } catch (e) {
      console.error('move.submit error', e);
    }
  });

  socket.on('disconnect', () => {
    console.log('match disconnected', socket.id);
    const p2 = onlineUsers.get(userId);
    if (p2) {
      p2.inMatch = false;
      onlineUsers.set(userId, p2);
      lobbyNs.emit('presence.update', { id: userId, inMatch: false });
    }
  });

  // Player quits: treat as forfeit and finalize match so leaderboard updates
  socket.on('match.quit', async ({ matchId }) => {
    try {
      const room = `match:${matchId}`;
      const match = await Match.findById(matchId);
      if (!match) return;
      if (match.status === 'finished') return; // already done
      const state = matches.get(matchId);
      if (!state) return; // no state -> ignore

      let winner = null;
      if (match.playedVs === 'ai') {
        winner = 'AI';
      } else if (state.players && state.players.length === 2) {
        // Opponent gets the win
        const isP0 = state.players[0] === userId;
        const isP1 = state.players[1] === userId;
        if (!isP0 && !isP1) return; // not a participant
        winner = isP0 ? match.players[1] : match.players[0];
      }

      await finalizeMatch(matchId, winner);
      matchNs.to(room).emit('match.end', { winner: winner?.toString() || null, result: 'forfeit' });
    } catch (e) {
      console.error('match.quit error', e);
    }
  });

  // Arena rematch: handled inside match namespace so we have authenticated user context
  socket.on('rematch.request', async ({ matchId }) => {
    try {
      const room = `match:${matchId}`;
      const match = await Match.findById(matchId);
      if (!match) return;
      const state = matches.get(matchId);
      if (!state) return;

      // AI mode: create a brand new match for requester immediately
      if (match.playedVs === 'ai') {
        const newMatch = await Match.create({ gameType: match.gameType, status: 'active', players: [userId], playedVs: 'ai' });
        const newId = newMatch._id.toString();
        if (match.gameType === 'ttt') {
          matches.set(newId, { gameType: 'ttt', playedVs: 'ai', board: Array(9).fill(null), turn: 0, players: [userId], difficulty: aiDifficulty.get(matchId) || 'medium' });
        } else {
          matches.set(newId, { gameType: 'rps', playedVs: 'ai', choices: {}, players: [userId], difficulty: aiDifficulty.get(matchId) || 'medium' });
        }
        // carry forward difficulty
        if (aiDifficulty.has(matchId)) aiDifficulty.set(newId, aiDifficulty.get(matchId));
        matchNs.to(socket.id).emit('rematch.created', { matchId: newId, vs: 'ai' });
        return;
      }

      // Human vs Human: record request and wait for both players
      let set = rematchRequests.get(matchId);
      if (!set) {
        set = new Set();
        rematchRequests.set(matchId, set);
      }
      set.add(userId);

      const both = state.players.every((pid) => set.has(pid));
      if (!both) {
        matchNs.to(room).emit('rematch.pending', { requester: userId });
        return;
      }

      // Both requested: create new match with same players
      const newMatch = await Match.create({ gameType: match.gameType, status: 'active', players: match.players, playedVs: 'human' });
      const newId = newMatch._id.toString();
      if (match.gameType === 'ttt') {
        matches.set(newId, { gameType: 'ttt', playedVs: 'human', board: Array(9).fill(null), turn: 0, players: match.players.map((p) => p.toString()) });
      } else {
        matches.set(newId, { gameType: 'rps', playedVs: 'human', choices: {}, players: match.players.map((p) => p.toString()) });
      }
      const sockets = await matchNs.in(room).fetchSockets();
      sockets.forEach((s) => matchNs.to(s.id).emit('rematch.created', { matchId: newId, vs: 'human' }));
      rematchRequests.delete(matchId);
    } catch (e) {
      console.error('rematch.request error', e);
    }
  });
});

// ============== Invitations (Lobby) ==============
// Allow direct challenges between online users
lobbyNs.on('connection', (socket) => {
  const auth = socketUser(socket);
  if (!auth) return;

  socket.on('invite.send', async ({ toUserId, gameType }) => {
    try {
      if (!['ttt','rps'].includes(gameType)) return;
      if (!toUserId || toUserId === auth.userId) return;
      const target = onlineUsers.get(toUserId);
      const me = onlineUsers.get(auth.userId);
      if (!target) return socket.emit('invite.error', { message: 'User offline' });
      if (target.inMatch) return socket.emit('invite.error', { message: 'User is in a match' });
      if (me?.inMatch) return socket.emit('invite.error', { message: 'You are in a match' });
      // deliver invite
      lobbyNs.to(target.socketId).emit('invite.received', { from: { id: auth.userId, username: auth.username }, gameType });
      socket.emit('invite.sent', { to: { id: toUserId, username: target.username }, gameType });
    } catch (e) {
      console.error('invite.send error', e);
    }
  });

  socket.on('invite.accept', async ({ fromUserId, gameType }) => {
    try {
      if (!['ttt','rps'].includes(gameType)) return;
      const a = onlineUsers.get(fromUserId);
      const b = onlineUsers.get(auth.userId);
      if (!a || !b) return;
      if (a.inMatch || b.inMatch) return;
      // Create human match using lobby namespace sockets
      const fromSocket = lobbyNs.sockets.get(a.socketId);
      await createHumanMatch(gameType, { userId: fromUserId, socket: fromSocket }, { userId: auth.userId, socket });
    } catch (e) {
      console.error('invite.accept error', e);
    }
  });
});

async function start() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Mongo connected');
    server.listen(PORT, () => {
      console.log(`API listening on :${PORT}`);
      console.log('Allowed CORS origins:', CORS_ORIGIN);
    });
  } catch (err) {
    console.error('Failed to start server', err);
    process.exit(1);
  }
}

start();







