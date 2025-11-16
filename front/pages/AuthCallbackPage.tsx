import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const TOKEN_KEY = 'eranker_access_token';

const AuthCallbackPage: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const token = params.get('token');
      if (token) {
        localStorage.setItem(TOKEN_KEY, token);
        // Дадим AuthProvider перезагрузиться и подтянуть /auth/me
        navigate('/', { replace: true });
      } else {
        navigate('/login?error=missing_token', { replace: true });
      }
    } catch {
      navigate('/login?error=callback_failed', { replace: true });
    }
  }, [navigate]);

  return null;
};

export default AuthCallbackPage;
