import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

// ─── Context ────────────────────────────────────────────────────────────────

interface UnsavedChangesContextValue {
  /** Whether the current form has unsaved edits. */
  isDirty: boolean;
  /** Mark / unmark the form as dirty. */
  setIsDirty: (v: boolean) => void;
  /**
   * Attempt a client-side navigation.
   *
   * If the form is dirty the dialog is shown and navigation is deferred
   * until the user confirms. Returns `true` when navigation happened
   * immediately (form was clean).
   */
  attemptNavigation: (path: string) => boolean;
  /** User confirmed — proceed with the pending navigation. */
  confirmNavigation: () => void;
  /** User cancelled — close the dialog and stay on the page. */
  cancelNavigation: () => void;
  /** Whether the confirmation dialog should be visible. */
  isDialogOpen: boolean;
}

const UnsavedChangesContext = createContext<UnsavedChangesContextValue | undefined>(
  undefined,
);

// ─── Provider ───────────────────────────────────────────────────────────────

interface UnsavedChangesProviderProps {
  children: ReactNode;
}

export function UnsavedChangesProvider({ children }: UnsavedChangesProviderProps) {
  const [isDirty, setIsDirty] = useState(false);
  const [pendingPath, setPendingPath] = useState<string | null>(null);
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // Reset dirty state whenever the route actually changes
  useEffect(() => {
    setIsDirty(false);
    setPendingPath(null);
  }, [pathname]);

  // Warn on browser close / refresh when form is dirty
  useEffect(() => {
    if (!isDirty) return;

    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };

    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  const attemptNavigation = useCallback(
    (path: string): boolean => {
      if (!isDirty) {
        navigate(path);
        return true;
      }
      setPendingPath(path);
      return false;
    },
    [isDirty, navigate],
  );

  const confirmNavigation = useCallback(() => {
    if (pendingPath) {
      setIsDirty(false);
      navigate(pendingPath);
      setPendingPath(null);
    }
  }, [pendingPath, navigate]);

  const cancelNavigation = useCallback(() => {
    setPendingPath(null);
  }, []);

  const isDialogOpen = pendingPath !== null;

  const value: UnsavedChangesContextValue = {
    isDirty,
    setIsDirty,
    attemptNavigation,
    confirmNavigation,
    cancelNavigation,
    isDialogOpen,
  };

  // eslint-disable-next-line react/jsx-no-constructed-context-values -- value is stable enough
  return (
    <UnsavedChangesContext.Provider value={value}>
      {children}
    </UnsavedChangesContext.Provider>
  );
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useUnsavedChanges(): UnsavedChangesContextValue {
  const ctx = useContext(UnsavedChangesContext);
  if (ctx === undefined) {
    throw new Error(
      'useUnsavedChanges must be used within an UnsavedChangesProvider',
    );
  }
  return ctx;
}
