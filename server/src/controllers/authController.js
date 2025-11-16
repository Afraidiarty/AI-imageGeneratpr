import { createUser, getUserByEmail, verifyPassword, getUserWithCredits } from '../services/userService.js';
import { getSubscriptionForUser } from '../services/stripeService.js';
import { signToken } from '../utils/jwt.js';
import { UnauthorizedError, ValidationError } from '../utils/errors.js';

const sanitizeUser = (user) => ({
  id: user.id,
  email: user.email,
  stripeCustomerId: user.stripe_customer_id ?? user.stripeCustomerId ?? null
});

export const register = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    throw new ValidationError('Email and password are required');
  }
  if (password.length < 8) {
    throw new ValidationError('Password must be at least 8 characters long');
  }

  const user = await createUser(email, password);
  const token = signToken(user);
  const credits = 0;

  res.status(201).json({
    token,
    user: sanitizeUser(user),
    credits,
    subscription: null
  });
};

export const login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    throw new ValidationError('Email and password are required');
  }

  const existing = await getUserByEmail(email);
  if (!existing) {
    throw new UnauthorizedError('Invalid credentials');
  }

  const isValid = await verifyPassword(password, existing.password_hash);
  if (!isValid) {
    throw new UnauthorizedError('Invalid credentials');
  }

  const token = signToken(existing);
  const user = sanitizeUser(existing);
  const credits = await getUserWithCredits(existing.id).then((data) => data?.credits ?? 0);
  const subscription = await getSubscriptionForUser(existing.id);

  res.json({ token, user, credits, subscription });
};

export const me = async (req, res) => {
  const userId = req.user.id;
  const userWithCredits = await getUserWithCredits(userId);

  if (!userWithCredits) {
    throw new UnauthorizedError('User not found');
  }

  const subscription = await getSubscriptionForUser(userId);

  res.json({
    user: sanitizeUser(userWithCredits),
    credits: userWithCredits.credits,
    subscription
  });
};
