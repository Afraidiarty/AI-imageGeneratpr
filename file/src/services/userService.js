import bcrypt from 'bcryptjs';
import { pool, query } from './db.js';
import { ValidationError, NotFoundError } from '../utils/errors.js';

const SALT_ROUNDS = 10;

export const getUserByEmail = async (email) => {
  if (!email) return null;
  const normalized = email.trim().toLowerCase();
  const rows = await query('SELECT * FROM users WHERE email = ? LIMIT 1', [normalized]);
  return rows[0] ?? null;
};

export const getUserById = async (id) => {
  const rows = await query('SELECT * FROM users WHERE id = ? LIMIT 1', [id]);
  return rows[0] ?? null;
};

export const getUserByStripeCustomerId = async (customerId) => {
  if (!customerId) return null;
  const rows = await query('SELECT * FROM users WHERE stripe_customer_id = ? LIMIT 1', [customerId]);
  return rows[0] ?? null;
};

export const createUser = async (email, password) => {
  if (!email || !password) {
    throw new ValidationError('Email and password are required');
  }
  const normalized = email.trim().toLowerCase();
  const existing = await getUserByEmail(normalized);
  if (existing) {
    throw new ValidationError('Email is already in use');
  }
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const [result] = await pool.execute(
    'INSERT INTO users (email, password_hash) VALUES (?, ?)',
    [normalized, passwordHash]
  );
  const userId = result.insertId;
  await pool.execute('INSERT INTO user_credits (user_id, credits) VALUES (?, 0)', [userId]);
  return { id: userId, email: normalized };
};

export const verifyPassword = async (password, passwordHash) => {
  return bcrypt.compare(password, passwordHash);
};

export const updateStripeCustomerId = async (userId, customerId) => {
  if (!userId) {
    throw new NotFoundError('User not found');
  }
  await pool.execute('UPDATE users SET stripe_customer_id = ? WHERE id = ?', [customerId, userId]);
};

export const ensureCreditsRow = async (userId) => {
  await pool.execute(
    'INSERT INTO user_credits (user_id, credits) VALUES (?, 0) ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP',
    [userId]
  );
};

export const getUserWithCredits = async (userId) => {
  const rows = await query(
    `SELECT u.id, u.email, u.stripe_customer_id AS stripeCustomerId, COALESCE(c.credits, 0) AS credits
     FROM users u
     LEFT JOIN user_credits c ON c.user_id = u.id
     WHERE u.id = ? LIMIT 1`,
    [userId]
  );
  return rows[0] ?? null;
};

