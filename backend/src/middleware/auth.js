import jwt from 'jsonwebtoken';

export function signAccessToken(payload) {
  const secret = process.env.JWT_SECRET;
  return jwt.sign(payload, secret, { expiresIn: '2h' });
}

export function requireAuth(req, res, next) {
  try {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ message: 'Missing token' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (e) {
    return res.status(401).json({ message: 'Invalid token' });
  }
}
