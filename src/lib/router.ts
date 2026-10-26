import { useCallback, useSyncExternalStore } from 'react';

// Lightweight router using the History API. Routes are plain paths like "/worker/jobs".
// Centralized store: a single source of truth shared across all useRouter() consumers,
// so navigation in one component updates every mounted component immediately.

interface RouterState {
  path: string; // full path including query string
}

let routerState: RouterState = {
  path: typeof window !== 'undefined' ? window.location.pathname + window.location.search : '/',
};

const routerListeners = new Set<() => void>();

function notifyRouterListeners() {
  routerListeners.forEach((l) => l());
}

function setRouterPath(path: string) {
  if (path === routerState.path) {
    window.scrollTo({ top: 0 });
    return;
  }
  routerState = { path };
  notifyRouterListeners();
  window.scrollTo({ top: 0 });
}

// Initialize popstate handling once at module load.
if (typeof window !== 'undefined') {
  window.addEventListener('popstate', () => {
    routerState = { path: window.location.pathname + window.location.search };
    notifyRouterListeners();
    window.scrollTo({ top: 0 });
  });
  // Normalize initial path
  if (!window.location.pathname) {
    window.history.replaceState({}, '', '/');
    routerState = { path: '/' };
  }
}

function subscribeRouter(listener: () => void) {
  routerListeners.add(listener);
  return () => {
    routerListeners.delete(listener);
  };
}

function getRouterSnapshot(): RouterState {
  return routerState;
}

function getRouterServerSnapshot(): RouterState {
  return { path: '/' };
}

export function useRouter() {
  const state = useSyncExternalStore(subscribeRouter, getRouterSnapshot, getRouterServerSnapshot);

  const navigate = useCallback((to: string) => {
    if (to === window.location.pathname + window.location.search) {
      window.scrollTo({ top: 0 });
      return;
    }
    window.history.pushState({}, '', to);
    setRouterPath(to);
  }, []);

  return { path: state.path, navigate };
}

export interface LinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  to: string;
}

export function linkProps(to: string, navigate: (to: string) => void) {
  return {
    href: to,
    onClick: (e: React.MouseEvent<HTMLAnchorElement>) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      e.preventDefault();
      navigate(to);
    },
  };
}
