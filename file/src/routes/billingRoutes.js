import { Router } from 'express';
import {
  getPlans,
  createSubscriptionSessionHandler,
  createCreditPackSessionHandler,
  getSubscription,
  cancelSubscription
} from '../controllers/billingController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.get('/plans', getPlans);
router.post('/subscription/checkout', authMiddleware, createSubscriptionSessionHandler);
router.post('/subscription/cancel', authMiddleware, cancelSubscription);
router.get('/subscription', authMiddleware, getSubscription);
router.post('/credits/checkout', authMiddleware, createCreditPackSessionHandler);

export default router;

