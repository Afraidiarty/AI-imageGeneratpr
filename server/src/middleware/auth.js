import { verifyToken } from '../utils/jwt.js';
import { UnauthorizedError } from '../utils/errors.js';

export const authMiddleware = (req, res, next) => {
  const header = req.headers.authorization ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    throw new UnauthorizedError();
  }
  try {
    const payload = verifyToken(token);
    req.user = {
      id: Number(payload.sub),
      email: payload.email
    };
    next();
  } catch (error) {
    throw new UnauthorizedError('Invalid or expired token');
  }
};

