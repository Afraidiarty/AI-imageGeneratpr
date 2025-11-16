// pages/RegisterPage.tsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Spinner from '../components/Spinner';
import { useAuth } from '../contexts/AuthContext';
import { ApiError } from '../services/apiClient';

const GOOGLE_OAUTH_URL =
  import.meta.env.VITE_API_BASE_URL
    ? `${import.meta.env.VITE_API_BASE_URL}/auth/google`
    : '/auth/google';

const GoogleIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
    <path
      fill="#EA4335"
      d="M12 10.2v3.9h5.5c-.24 1.4-1.67 4.1-5.5 4.1-3.32 0-6-2.74-6-6.1s2.68-6.1 6-6.1c1.9 0 3.18.8 3.9 1.5l2.66-2.57C16.65 3.1 14.5 2.2 12 2.2 6.98 2.2 2.9 6.34 2.9 12s4.08 9.8 9.1 9.8c5.26 0 8.73-3.69 8.73-8.9 0-.6-.06-1.05-.14-1.5H12z"
    />
  </svg>
);

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { register, setAuthError, authError } = useAuth();

  const [form, setForm] = useState({ email: '', password: '', confirm: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (authError) setAuthError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirm) {
      setAuthError('Пароли должны совпадать.');
      return;
    }
    setIsSubmitting(true);
    try {
      await register(form.email, form.password);
      navigate('/');
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : 'Ошибка регистрации. Попробуйте ещё раз.';
      setAuthError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogle = () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    // редирект на ваш backend: /auth/google (он сам создаст пользователя, если его ещё нет)
    window.location.href = GOOGLE_OAUTH_URL;
  };

  return (
    <div className="min-h-screen bg-black text-neutral-100">
      <Header />
      <main className="flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md bg-[#1C1C1E] border border-neutral-800 rounded-2xl shadow-xl p-8">
          <h2 className="text-3xl font-bold text-white mb-2">Регистрация</h2>
          <p className="text-neutral-400 mb-6">
            Создайте аккаунт, чтобы управлять подпиской и кредитами.
          </p>

          {authError && (
            <div className="bg-red-500/10 border border-red-500 text-red-300 px-4 py-2 rounded-lg mb-4 text-sm">
              {authError}
            </div>
          )}

          {/* Google Sign-Up (через OAuth, фактически Sign-In/Up) */}
          <button
            type="button"
            onClick={handleGoogle}
            disabled={isSubmitting}
            className="group relative w-full overflow-hidden rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 transition
                       hover:bg-white/10 active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <span className="absolute inset-0 pointer-events-none bg-gradient-to-r from-white/0 via-white/10 to-white/0 opacity-0 group-hover:opacity-100 transition" />
            <GoogleIcon className="h-5 w-5" />
            <span className="font-medium">Зарегистрироваться через Google</span>
          </button>

          {/* Divider */}
          <div className="my-6 flex items-center gap-3">
            <span className="h-px flex-1 bg-white/10" />
            <span className="text-xs text-neutral-400 uppercase tracking-wider">или</span>
            <span className="h-px flex-1 bg-white/10" />
          </div>

          {/* Email / Password form */}
          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="text-sm font-semibold text-neutral-300">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                required
                className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/40"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="text-sm font-semibold text-neutral-300">
                Пароль
              </label>
              <input
                id="password"
                name="password"
                type="password"
                value={form.password}
                onChange={handleChange}
                required
                minLength={8}
                className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/40"
                placeholder="Минимум 8 символов"
              />
            </div>

            <div>
              <label htmlFor="confirm" className="text-sm font-semibold text-neutral-300">
                Повторите пароль
              </label>
              <input
                id="confirm"
                name="confirm"
                type="password"
                value={form.confirm}
                onChange={handleChange}
                required
                className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/40"
                placeholder="Ещё раз пароль"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center justify-center gap-2 rounded-lg bg-orange-600 py-2 font-bold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? (
                <>
                  <Spinner size="small" />
                  <span>Создаём...</span>
                </>
              ) : (
                'Создать аккаунт'
              )}
            </button>
          </form>

          <p className="mt-6 text-sm text-neutral-400">
            Уже есть аккаунт?{' '}
            <Link to="/login" className="text-orange-400 hover:text-orange-300 font-semibold">
              Войти
            </Link>
          </p>

          <p className="mt-4 text-center text-xs text-neutral-500">
            Продолжая, вы принимаете наши Условия и Политику конфиденциальности.
          </p>
        </div>
      </main>
    </div>
  );
};

export default RegisterPage;
