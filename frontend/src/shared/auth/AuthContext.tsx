import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
  type ReactNode,
  type Dispatch,
} from 'react';
import type { User } from '@/shared/types';

// ─── State ───────────────────────────────────────────────────────────────────

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const initialState: AuthState = {
  user: null,
  accessToken: localStorage.getItem('accessToken'),
  isAuthenticated: false,
  isLoading: true,
};

// ─── Actions ─────────────────────────────────────────────────────────────────

type AuthAction =
  | { type: 'SET_CREDENTIALS'; payload: { user: User; accessToken: string; refreshToken?: string } }
  | { type: 'SET_USER'; payload: User }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'LOGOUT' }
  | { type: 'REFRESH_TOKEN'; payload: string };

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'SET_CREDENTIALS': {
      const { user, accessToken, refreshToken } = action.payload;
      localStorage.setItem('accessToken', accessToken);
      if (refreshToken) {
        localStorage.setItem('refreshToken', refreshToken);
      }
      return { user, accessToken, isAuthenticated: true, isLoading: false };
    }
    case 'SET_USER':
      return { ...state, user: action.payload };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'LOGOUT':
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      return { user: null, accessToken: null, isAuthenticated: false, isLoading: false };
    case 'REFRESH_TOKEN': {
      const accessToken = action.payload;
      localStorage.setItem('accessToken', accessToken);
      return { ...state, accessToken };
    }
    default:
      return state;
  }
}

// ─── Contexts ────────────────────────────────────────────────────────────────

const AuthStateContext = createContext<AuthState | undefined>(undefined);
const AuthDispatchContext = createContext<Dispatch<AuthAction> | undefined>(undefined);

// ─── Provider ────────────────────────────────────────────────────────────────

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  /**
   * On mount, if a persisted access token exists but we have no user yet,
   * validate the token with the server and hydrate the auth state.
   *
   * NOTE: The actual /auth/check call is triggered from App.tsx so that it
   * can use the `api` client (which lives outside React context). This
   * provider only manages state — the hydration orchestration lives in App.
   */
  useEffect(() => {
    if (!state.accessToken) {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AuthStateContext.Provider value={state}>
      <AuthDispatchContext.Provider value={dispatch}>
        {children}
      </AuthDispatchContext.Provider>
    </AuthStateContext.Provider>
  );
}

// ─── Hooks ───────────────────────────────────────────────────────────────────

export function useAuthState(): AuthState {
  const ctx = useContext(AuthStateContext);
  if (ctx === undefined) {
    throw new Error('useAuthState must be used within an AuthProvider');
  }
  return ctx;
}

export function useAuthDispatch(): Dispatch<AuthAction> {
  const ctx = useContext(AuthDispatchContext);
  if (ctx === undefined) {
    throw new Error('useAuthDispatch must be used within an AuthProvider');
  }
  return ctx;
}

/**
 * Convenience hook returning both state and commonly needed helpers.
 */
export function useAuth() {
  const state = useAuthState();
  const dispatch = useAuthDispatch();

  const logout = useCallback(() => {
    dispatch({ type: 'LOGOUT' });
  }, [dispatch]);

  return { ...state, dispatch, logout };
}
