import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

import { env } from './config/env.js';
import authRoutes from './routes/authRoutes.js';
import billingRoutes from './routes/billingRoutes.js';
import creditRoutes from './routes/creditRoutes.js';
import { stripeWebhook } from './controllers/billingController.js';
import { AppError } from './utils/errors.js';

const app = express();

app.post('/api/billing/webhook', express.raw({ type: 'application/json' }), stripeWebhook);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (env.corsOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('CORS not allowed for this origin'));
  },
  credentials: true
}));
app.use(helmet());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

app.use('/api/auth', authRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/credits', creditRoutes);
app.use('/api/auth', authRoutes);


// временный редирект, чтобы старый URL Google тоже работал
app.get('/auth/google/callback', (req, res) => {
  const params = new URLSearchParams(req.query).toString();
  res.redirect(`/api/auth/google/callback?${params}`);
});


app.use((req, res, next) => {
  next(new AppError('Route not found', 404));
});

app.use((err, req, res, next) => {
  const status = err.status ?? 500;
  const message = err.message ?? 'Unexpected server error';
  const code = err.code ?? 'SERVER_ERROR';
  if (status >= 500) {
    console.error(err);
  }
  res.status(status).json({ message, code });
});

app.listen(env.port, () => {
  console.log(`API ready on port ${env.port}`);
});

