import mongoose from 'mongoose';

const StatsSchema = new mongoose.Schema({
  wins: { type: Number, default: 0 },
  losses: { type: Number, default: 0 },
  draws: { type: Number, default: 0 },
  elo: { type: Number, default: 1000 },
  gamesPlayed: { type: Number, default: 0 },
}, { _id: false });

const UserSchema = new mongoose.Schema({
  email: { type: String, unique: true, index: true, required: true },
  username: { type: String, unique: true, index: true, required: true },
  passwordHash: { type: String, required: true },
  avatarUrl: { type: String },
  statsTTT: { type: StatsSchema, default: () => ({}) },
  statsRPS: { type: StatsSchema, default: () => ({}) },
}, { timestamps: true });

export const User = mongoose.models.User || mongoose.model('User', UserSchema);
