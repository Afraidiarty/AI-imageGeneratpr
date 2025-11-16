import { Router } from 'express';
import { getBalance, deduct } from '../controllers/creditController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.get('/', authMiddleware, getBalance);
router.post('/deduct', authMiddleware, deduct);

export default router;

