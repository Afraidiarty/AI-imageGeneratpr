  import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
  import type { AuthUser, SubscriptionInfo, CreditAction } from '../types';
  import { apiRequest, ApiError } from '../services/apiClient';

  interface AuthResponse {
    token: string;
    user: AuthUser;
    credits: number;
    subscription: SubscriptionInfo | null;
  }

  interface ProfileResponse {
    user: AuthUser;
    credits: number;
    subscription: SubscriptionInfo | null;
  }

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  credits: number | null;
  subscription: SubscriptionInfo | null;
  isAuthInitializing: boolean;
  authError: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshProfile: (overrideToken?: string) => Promise<void>;
  requireCredits: (action: CreditAction, metadata?: Record<string, unknown>) => Promise<number>;
  setAuthError: React.Dispatch<React.SetStateAction<string | null>>;
}

  const TOKEN_KEY = 'eranker_access_token';

  const AuthContext = createContext<AuthContextValue | undefined>(undefined);

  export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
    const [user, setUser] = useState<AuthUser | null>(null);
    const [credits, setCredits] = useState<number | null>(null);
    const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
    const [isAuthInitializing, setIsAuthInitializing] = useState(true);
    const [authError, setAuthError] = useState<string | null>(null);
    const [justLoggedIn, setJustLoggedIn] = useState(false); // ⬅️ новый флаг

    const persistToken = useCallback((value: string | null) => {
      setToken(value);
      if (value) {
        localStorage.setItem(TOKEN_KEY, value);
      } else {
        localStorage.removeItem(TOKEN_KEY);
      }
    }, []);

    const resetState = useCallback(() => {
      setUser(null);
      setCredits(null);
      setSubscription(null);
    }, []);

    const handleAuthSuccess = useCallback(
      (payload: AuthResponse) => {
        persistToken(payload.token);
        setUser(payload.user);
        setCredits(payload.credits);
        setSubscription(payload.subscription ?? null);
        setAuthError(null);
      },
      [persistToken]
    );

  const refreshProfile = useCallback(async (overrideToken?: string) => {
    const tk = overrideToken ?? token;
    if (!tk) {
      resetState();
      setIsAuthInitializing(false);
      return;
    }
    try {
      setIsAuthInitializing(true);
      const profile = await apiRequest<ProfileResponse>('/auth/me', { method: 'GET', token: tk });
      if (overrideToken) {
        // Persist newly received token from OAuth callback
        persistToken(overrideToken);
      }
      setUser(profile.user);
      setCredits(profile.credits);
      setSubscription(profile.subscription ?? null);
      setAuthError(null);
    } catch (error) {
      console.error('Failed to load profile', error);
      persistToken(null);
      resetState();
      setAuthError(error instanceof Error ? error.message : 'Session expired');
    } finally {
      setIsAuthInitializing(false);
    }
  }, [token, persistToken, resetState]);

    // при запуске проверяем токен
  useEffect(() => {
    if (user || justLoggedIn) return;
    refreshProfile();
  }, [user, justLoggedIn, refreshProfile]);

    const login = useCallback(
      async (email: string, password: string) => {
        const response = await apiRequest<AuthResponse>('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        });
        handleAuthSuccess(response);
        setIsAuthInitializing(false);
        setJustLoggedIn(true);
        setTimeout(() => setJustLoggedIn(false), 2000);
      },
      [handleAuthSuccess]
    );

    const register = useCallback(
      async (email: string, password: string) => {
        const response = await apiRequest<AuthResponse>('/auth/register', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        });
        handleAuthSuccess(response);
        setIsAuthInitializing(false);
        setJustLoggedIn(true);
        setTimeout(() => setJustLoggedIn(false), 2000);
      },
      [handleAuthSuccess]
    );

      const logout = useCallback(() => {
        persistToken(null);
        resetState();
      setIsAuthInitializing(false);
      }, [persistToken, resetState]);

    const requireCredits = useCallback(
      async (action: CreditAction, metadata?: Record<string, unknown>) => {
        if (!token) {
          throw new ApiError('Authentication required', 401, null);
        }
        const response = await apiRequest<{ credits: number }>('/credits/deduct', {
          method: 'POST',
          body: JSON.stringify({ action, metadata }),
          token,
        });
        setCredits(response.credits);
        return response.credits;
      },
      [token]
    );

    const value = useMemo<AuthContextValue>(
      () => ({
        user,
        token,
        credits,
        subscription,
        isAuthInitializing,
        authError,
        login,
        register,
        logout,
        refreshProfile,
        requireCredits,
        setAuthError,
      }),
      [user, token, credits, subscription, isAuthInitializing, authError, login, register, logout, refreshProfile, requireCredits]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
  };

  export const useAuth = (): AuthContextValue => {
    const context = useContext(AuthContext);
    if (!context) {
      throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
  };
