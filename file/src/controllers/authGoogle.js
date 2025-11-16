import express from 'express';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { env } from '../config/env.js';
import { query } from '../services/db.js';
import { signToken } from '../utils/jwt.js';

// --- Функция очистки пользователя ---
function sanitizeUser(row) {
  return {
    id: row.id,
    email: row.email,
    stripeCustomerId: row.stripe_customer_id ?? null,
  };
}

// --- Инициализация стратегии Google ---
console.log('🔧 GOOGLE CONFIG:', env.google);

passport.use(
  new GoogleStrategy(
    {
      clientID: env.google.googleClientId,
      clientSecret: env.google.googleClientSecret,
      callbackURL: env.google.googleCallbackUrl,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const googleId = profile.id;
        const email = profile.emails?.[0]?.value?.toLowerCase() ?? null;
        const name = profile.displayName ?? null;
        const avatarUrl = profile.photos?.[0]?.value ?? null;

        if (!googleId) return done(new Error('No Google ID in profile'));

        // 1️⃣ Пытаемся найти по google_id
        let rows = await query('SELECT * FROM users WHERE google_id = ? LIMIT 1', [googleId]);
        let user = rows[0];

        // 2️⃣ Если нет — ищем по email (связываем существующий аккаунт)
        if (!user && email) {
          rows = await query('SELECT * FROM users WHERE email = ? LIMIT 1', [email]);
          user = rows[0];
        }

        // 3️⃣ Если нет — создаём нового пользователя
        if (!user) {
          const insert = await query(
            `INSERT INTO users (email, password_hash, stripe_customer_id, google_id, name, avatar_url)
             VALUES (?, NULL, NULL, ?, ?, ?)`,
            [email, googleId, name, avatarUrl]
          );
          const [created] = await query('SELECT * FROM users WHERE id = ? LIMIT 1', [insert.insertId]);
          return done(null, created);
        }

        // 4️⃣ Если нашли — обновляем профиль
        await query(
          `UPDATE users 
           SET google_id = COALESCE(google_id, ?), name = ?, avatar_url = ?
           WHERE id = ?`,
          [googleId, name, avatarUrl, user.id]
        );

        const [updated] = await query('SELECT * FROM users WHERE id = ? LIMIT 1', [user.id]);
        return done(null, updated);
      } catch (err) {
        return done(err);
      }
    }
  )
);

// --- Роутер Google ---
export const googleAuthRouter = express.Router();

/**
 *  /api/auth/google
 *  ➜ Запуск авторизации через Google
 */
googleAuthRouter.get(
  '/',
  passport.authenticate('google', { scope: ['profile', 'email'], prompt: 'select_account' })
);

/**
 *  /api/auth/google/callback
 *  ➜ Google возвращает сюда после успешного входа
 */
googleAuthRouter.get(
  '/callback',
  passport.authenticate('google', {
    session: false,
    failureRedirect: `${env.frontendUrl}/login?err=google`,
  }),
  (req, res) => {
    const user = sanitizeUser(req.user);
    const token = signToken(user);
    const redirectUrl = `${env.frontendUrl}/oauth/callback?token=${encodeURIComponent(token)}`;
    res.redirect(302, redirectUrl);
  }
);
