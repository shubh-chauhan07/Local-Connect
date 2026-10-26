import { useEffect, useState, useCallback, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, AlertCircle, Info, X, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

const listeners = new Set<(t: Toast) => void>();

export function toast(type: ToastType, message: string) {
  const id = `t_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  listeners.forEach((l) => l({ id, type, message }));
}

export const toastSuccess = (m: string) => toast('success', m);
export const toastError = (m: string) => toast('error', m);
export const toastInfo = (m: string) => toast('info', m);

const icons: Record<ToastType, ReactNode> = {
  success: <CheckCircle2 className="h-5 w-5 text-success-600" />,
  error: <XCircle className="h-5 w-5 text-error-600" />,
  info: <Info className="h-5 w-5 text-accent-600" />,
  warning: <AlertCircle className="h-5 w-5 text-warning-600" />,
};

const borders: Record<ToastType, string> = {
  success: 'border-success-500/30',
  error: 'border-error-500/30',
  info: 'border-accent-500/30',
  warning: 'border-warning-500/30',
};

export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: string) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  useEffect(() => {
    const l = (t: Toast) => {
      setToasts((prev) => [...prev, t]);
      setTimeout(() => remove(t.id), 4000);
    };
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, [remove]);

  if (toasts.length === 0) return null;

  return createPortal(
    <div className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2 w-[calc(100vw-2rem)] max-w-sm pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            'pointer-events-auto flex items-start gap-3 rounded-xl border bg-white px-4 py-3 shadow-pop animate-slideUp',
            borders[t.type],
          )}
        >
          <span className="mt-0.5 shrink-0">{icons[t.type]}</span>
          <p className="flex-1 text-sm text-ink-800">{t.message}</p>
          <button
            onClick={() => remove(t.id)}
            className="shrink-0 rounded p-0.5 text-ink-300 hover:text-ink-600"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>,
    document.body,
  );
}
