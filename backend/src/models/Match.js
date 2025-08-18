import mongoose from 'mongoose';

const MatchSchema = new mongoose.Schema({
  gameType: { type: String, enum: ['ttt', 'rps'], required: true },
  status: { type: String, enum: ['pending', 'active', 'finished'], default: 'pending' },
  players: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  winnerUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  playedVs: { type: String, enum: ['human', 'ai'], default: 'human' },
}, { timestamps: true });

export const Match = mongoose.models.Match || mongoose.model('Match', MatchSchema);
