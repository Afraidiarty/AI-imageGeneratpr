import { Router } from 'express';
import { register, login, me } from '../controllers/authController.js';
import { authMiddleware } from '../middleware/auth.js';
import { googleAuthRouter } from '../controllers/authGoogle.js';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', authMiddleware, me);

router.use('/google', googleAuthRouter);

export default router;
