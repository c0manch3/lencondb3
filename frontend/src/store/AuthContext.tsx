import { createContext, useContext, useReducer, type ReactNode, type Dispatch } from 'react';

export type UserRole = 'Admin' | 'Manager' | 'Employee' | 'Trial';

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: UserRole;
  telegramId?: string;
  salary?: number;
  dateBirth?: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

type AuthAction =
  | { type: 'SET_CREDENTIALS'; payload: { user: User; accessToken: string } }
  | { type: 'SET_USER'; payload: User }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'LOGOUT' }
  | { type: 'REFRESH_TOKEN'; payload: string };

const initialState: AuthState = {
  user: null,
  accessToken: localStorage.getItem('accessToken'),
  isAuthenticated: !!localStorage.getItem('accessToken'),
  isLoading: false,
};

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'SET_CREDENTIALS':
      localStorage.setItem('accessToken', action.payload.accessToken);
      return {
        ...state,
        user: action.payload.user,
        accessToken: action.payload.accessToken,
        isAuthenticated: true,
      };
    case 'SET_USER':
      return { ...state, user: action.payload };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'LOGOUT':
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      return {
        ...state,
        user: null,
        accessToken: null,
        isAuthenticated: false,
      };
    case 'REFRESH_TOKEN':
      localStorage.setItem('accessToken', action.payload);
      return { ...state, accessToken: action.payload };
    default:
      return state;
  }
}

const AuthContext = createContext<{
  state: AuthState;
  dispatch: Dispatch<AuthAction>;
} | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);
  return (
    <AuthContext.Provider value={{ state, dispatch }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

/** Convenience hook that returns just the auth state. */
export function useAuthState() {
  const { state } = useAuth();
  return state;
}

/** Convenience hook that returns just the dispatch. */
export function useAuthDispatch() {
  const { dispatch } = useAuth();
  return dispatch;
}
