// App.tsx
import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Spinner from './components/Spinner';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import SubscriptionsPage from './pages/SubscriptionsPage';
import StudioPage from './pages/StudioPage';
import OAuthCallbackPage from './pages/OAuthCallbackPage';

// Пускает только авторизованных. Иначе — на /login
const ProtectedRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { user, isAuthInitializing } = useAuth();

  if (isAuthInitializing) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Spinner />
          <p className="text-neutral-400 text-sm">Загружаем рабочее пространство…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

// Пускает только гостей. Если уже авторизован (Google или руками) — сразу в студию
const GuestRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { user, isAuthInitializing } = useAuth();

  if (isAuthInitializing) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Spinner />
          <p className="text-neutral-400 text-sm">Проверяем авторизацию…</p>
        </div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

// Умный редирект с корня: если авторизован — в студию, иначе — на логин
const HomeRedirect: React.FC = () => {
  const { user, isAuthInitializing } = useAuth();

  if (isAuthInitializing) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Spinner />
          <p className="text-neutral-400 text-sm">Подготавливаем приложение…</p>
        </div>
      </div>
    );
  }

  return <Navigate to={user ? '/dashboard' : '/login'} replace />;
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Google OAuth callback: saves token then redirects */}
          <Route path="/oauth/callback" element={<OAuthCallbackPage />} />
          {/* Гостевые страницы: авторизованным вход запрещён — сразу в /dashboard */}
          <Route
            path="/login"
            element={
              <GuestRoute>
                <LoginPage />
              </GuestRoute>
            }
          />
          <Route
            path="/register"
            element={
              <GuestRoute>
                <RegisterPage />
              </GuestRoute>
            }
          />

          {/* Пример: подписки — только для авторизованных */}
          <Route
            path="/subscriptions"
            element={
              <ProtectedRoute>
                <SubscriptionsPage />
              </ProtectedRoute>
            }
          />

          {/* Студия/дашборд — только для авторизованных */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <StudioPage />
              </ProtectedRoute>
            }
          />

          {/* Корень — умный редирект по состоянию авторизации */}
          <Route path="/" element={<HomeRedirect />} />

          {/* Любой другой путь -> в /dashboard (далее сработает ProtectedRoute и при необходимости отправит на /login) */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
