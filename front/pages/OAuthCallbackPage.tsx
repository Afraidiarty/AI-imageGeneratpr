import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Spinner from '../components/Spinner';

const OAuthCallbackPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refreshProfile } = useAuth();

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      navigate('/login', { replace: true });
      return;
    }

    (async () => {
      await refreshProfile(token);
      navigate('/dashboard', { replace: true });
    })();
  }, [navigate, searchParams, refreshProfile]);

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center">
      <Spinner />
      <p className="text-neutral-400 mt-4">Завершаем вход через Google…</p>
    </div>
  );
};

export default OAuthCallbackPage;

