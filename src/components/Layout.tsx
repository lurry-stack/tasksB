import { ReactNode } from 'react';
import { Home, ShoppingBag, Users, User } from 'lucide-react';
import { useRouter } from '../lib/router';

const navItems = [
  { path: '/home', label: 'Home', icon: Home },
  { path: '/vip', label: 'Product', icon: ShoppingBag },
  { path: '/team', label: 'Team', icon: Users },
  { path: '/profile', label: 'Mine', icon: User },
];

export function Layout({ children }: { children: ReactNode }) {
  const { path, navigate } = useRouter();
  return (
    <div className="min-h-[100dvh] bg-background flex flex-col max-w-md mx-auto relative shadow-xl">
      <main className="flex-1 overflow-y-auto pb-24">{children}</main>
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-card/90 backdrop-blur-xl border-t border-border flex items-center justify-around py-2 z-40 safe-area-bottom">
        {navItems.map(({ path: p, label, icon: Icon }) => {
          const active = path === p || path.startsWith(p + '/');
          return (
            <button
              key={p}
              onClick={() => navigate(p)}
              className="group relative flex flex-col items-center gap-1 px-4 py-1.5 rounded-xl transition-all duration-200"
              aria-label={label}
              aria-current={active ? 'page' : undefined}
            >
              {active && (
                <span className="absolute -top-2 left-1/2 -translate-x-1/2 h-1 w-8 rounded-full bg-primary transition-all duration-300" />
              )}
              <span className={`p-1.5 rounded-xl transition-all duration-200 ${active ? 'bg-primary/10' : 'group-hover:bg-muted'}`}>
                <Icon
                  className={`w-5 h-5 transition-all duration-200 ${active ? 'text-primary scale-110' : 'text-muted-foreground group-hover:text-foreground'}`}
                  strokeWidth={active ? 2.5 : 2}
                  fill={active ? 'currentColor' : 'none'}
                  fillOpacity={active ? 0.1 : 0}
                />
              </span>
              <span className={`text-[10px] font-semibold transition-colors duration-200 ${active ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}`}>
                {label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

export function PageHeader({
  title,
  onBack,
  right,
}: {
  title: string;
  onBack?: () => void;
  right?: ReactNode;
}) {
  const { navigate } = useRouter();
  return (
    <div className="sticky top-0 z-30 bg-card/80 backdrop-blur-xl border-b border-border px-4 py-3.5 flex items-center gap-3 animate-fade-in">
      <button
        onClick={() => (onBack ? onBack() : navigate('/home'))}
        className="p-2 -ml-2 rounded-xl hover:bg-muted active:scale-90 transition-all text-foreground"
        aria-label="Go back"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
      </button>
      <h1 className="text-base font-bold text-foreground flex-1">{title}</h1>
      {right}
    </div>
  );
}
