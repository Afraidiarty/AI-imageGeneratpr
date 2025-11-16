import { getBalance as getBalanceService, listTransactions, deductCredits } from '../services/creditService.js';
import { ValidationError } from '../utils/errors.js';

export const getBalance = async (req, res) => {
  const userId = req.user.id;
  const [balance, transactions] = await Promise.all([
    getBalanceService(userId),
    listTransactions(userId, 25)
  ]);
  res.json({ credits: balance, transactions });
};

export const deduct = async (req, res) => {
  const userId = req.user.id;
  const { action, metadata } = req.body ?? {};
  if (!action) {
    throw new ValidationError('Action is required');
  }
  const remaining = await deductCredits(userId, action, metadata ?? {});
  res.json({ credits: remaining });
};

