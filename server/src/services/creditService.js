import { pool, query, withTransaction } from './db.js';
import { creditCosts, CREDIT_ACTION_LABELS } from '../config/billing.js';
import { InsufficientCreditsError, ValidationError } from '../utils/errors.js';

export const getBalance = async (userId) => {
  const rows = await query('SELECT credits FROM user_credits WHERE user_id = ? LIMIT 1', [userId]);
  return rows[0]?.credits ?? 0;
};

export const addCredits = async (userId, amount, reason, metadata = {}) => {
  if (amount <= 0) {
    throw new ValidationError('Amount must be positive');
  }
  return withTransaction(async (connection) => {
    await connection.execute(
      'INSERT INTO user_credits (user_id, credits) VALUES (?, ?) ON DUPLICATE KEY UPDATE credits = credits + VALUES(credits)',
      [userId, amount]
    );
    await connection.execute(
      'INSERT INTO credit_transactions (user_id, delta, reason, metadata) VALUES (?, ?, ?, ?)',
      [userId, amount, reason, JSON.stringify(metadata)]
    );
    const [balanceRows] = await connection.query('SELECT credits FROM user_credits WHERE user_id = ? LIMIT 1', [userId]);
    return balanceRows[0]?.credits ?? amount;
  });
};

export const deductCredits = async (userId, action, metadata = {}) => {
  const cost = creditCosts[action];
  if (!cost) {
    throw new ValidationError('Unknown credit action');
  }
  return withTransaction(async (connection) => {
    const [rows] = await connection.query('SELECT credits FROM user_credits WHERE user_id = ? FOR UPDATE', [userId]);
    let currentCredits = rows[0]?.credits ?? 0;
    if (rows.length === 0) {
      await connection.execute('INSERT INTO user_credits (user_id, credits) VALUES (?, 0)', [userId]);
    }
    if (currentCredits < cost) {
      throw new InsufficientCreditsError('You have run out of credits. Please top up to continue.');
    }
    currentCredits -= cost;
    await connection.execute('UPDATE user_credits SET credits = ? WHERE user_id = ?', [currentCredits, userId]);
    await connection.execute(
      'INSERT INTO credit_transactions (user_id, delta, reason, metadata) VALUES (?, ?, ?, ?)',
      [
        userId,
        -cost,
        `Deduction: ${CREDIT_ACTION_LABELS[action] ?? action}`,
        JSON.stringify({ ...metadata, action })
      ]
    );
    return currentCredits;
  });
};

export const listTransactions = async (userId, limit = 20) => {
  return query(
    'SELECT id, delta, reason, metadata, created_at AS createdAt FROM credit_transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT ?',
    [userId, limit]
  );
};

