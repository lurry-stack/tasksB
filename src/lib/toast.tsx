import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';

type Toast = { id: number; message: string; type: 'success' | 'error' | 'info' };
type ToastCtx = {
  toasts: Toast[];
  success: (m: string) => void;
  error: (m: string) => void;
  info: (m: string) => void;
  remove: (id: number) => void;
};

const Ctx = createContext<ToastCtx>({
  toasts: [],
  success: () => {},
  error: () => {},
  info: () => {},
  remove: () => {},
});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const push = useCallback((message: string, type: Toast['type']) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => remove(id), 3500);
  }, [remove]);

  const success = useCallback((m: string) => push(m, 'success'), [push]);
  const error = useCallback((m: string) => push(m, 'error'), [push]);
  const info = useCallback((m: string) => push(m, 'info'), [push]);

  const icons = {
    success: <CheckCircle2 className="w-5 h-5 shrink-0" />,
    error: <XCircle className="w-5 h-5 shrink-0" />,
    info: <Info className="w-5 h-5 shrink-0" />,
  };

  const styles = {
    success: 'bg-white border-emerald-200 text-emerald-800',
    error: 'bg-white border-red-200 text-red-800',
    info: 'bg-white border-slate-200 text-slate-800',
  };

  const iconColors = {
    success: 'text-emerald-500',
    error: 'text-red-500',
    info: 'text-slate-500',
  };

  return (
    <Ctx.Provider value={{ toasts, success, error, info, remove }}>
      {children}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 w-full max-w-sm px-4 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto rounded-2xl px-4 py-3.5 text-sm font-semibold shadow-xl animate-fade-in-up border ${styles[t.type]} flex items-center gap-3`}
            onClick={() => remove(t.id)}
          >
            <span className={iconColors[t.type]}>{icons[t.type]}</span>
            <span className="flex-1">{t.message}</span>
            <button onClick={(e) => { e.stopPropagation(); remove(t.id); }} className="text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);
