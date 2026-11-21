import { useEffect } from 'react';
import { Layout } from '../components/Layout';
import { useAuth } from '../lib/auth';
import { useRouter } from '../lib/router';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  ClipboardList,
  Info,
  ShieldCheck,
  Headphones,
  Users,
  CalendarCheck,
  KeyRound,
  LogOut,
  ChevronRight,
  Settings,
  ShoppingBag,
  Wallet,
  TrendingUp,
} from 'lucide-react';
import { fmt } from '../lib/supabase';

const menuItems = [
  { label: 'About Us', icon: Info, path: '/about' },
  { label: 'Investment Rules', icon: ShieldCheck, path: '/regulation' },
  { label: 'Records', icon: ClipboardList, path: '/records' },
  { label: 'Customer Service', icon: Headphones, path: '/support' },
  { label: 'Share & Earn', icon: Users, path: '/team' },
  { label: 'Check In', icon: CalendarCheck, path: '/checkin' },
  { label: 'My Products', icon: ShoppingBag, path: '/my-products' },
  { label: 'Change Password', icon: KeyRound, path: '/change-password' },
];

export function ProfilePage() {
  const { profile, signOut, isAdmin } = useAuth();
  const { navigate } = useRouter();

  useEffect(() => {
    if (!profile) navigate('/login', { replace: true });
  }, [profile, navigate]);

  if (!profile) return null;

  const initials = (profile.full_name || 'AL ZAIN BAKERS')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <Layout>
      <div className="bg-background flex flex-col min-h-full">
        {/* Profile header */}
        <div className="relative overflow-hidden px-4 pt-5 pb-6 bg-gradient-hero">
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/5" />
          <div className="absolute -bottom-12 -left-10 w-40 h-40 rounded-full bg-white/5" />
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              {isAdmin ? (
                <button
                  onClick={() => navigate('/admin')}
                  className="flex items-center gap-1.5 text-xs border border-white/30 text-white px-3 py-1.5 rounded-full backdrop-blur-sm bg-white/10 active:scale-95 transition-transform"
                >
                  <Settings className="w-3.5 h-3.5" /> Admin Panel
                </button>
              ) : (
                <div />
              )}
              <button
                onClick={async () => { await signOut(); navigate('/login', { replace: true }); }}
                className="flex items-center gap-1.5 border border-white/30 text-white text-xs px-3 py-1.5 rounded-full font-semibold backdrop-blur-sm bg-white/10 active:scale-95 transition-transform"
              >
                <LogOut className="w-3.5 h-3.5" /> Sign out
              </button>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-white/15 border-2 border-white/25 flex items-center justify-center shrink-0 backdrop-blur-sm">
                <span className="text-white font-black text-lg">{initials}</span>
              </div>
              <div>
                <div className="text-white font-black text-lg leading-tight">{profile.full_name || 'Al Zain Bakers User'}</div>
                <div className="text-white/70 text-xs mt-1 font-mono tracking-wide">
                  ID: {profile.phone || profile.id?.slice(0, 12) || '—'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Balance cards */}
        <div className="mx-3 -mt-4 grid grid-cols-2 gap-3 relative z-10">
          {[
            { label: 'Account Balance', value: profile.main_balance || 0, icon: Wallet, color: 'text-primary', bg: 'bg-primary/10' },
            { label: 'Total Earnings', value: profile.total_earnings || 0, icon: TrendingUp, color: 'text-amber-500', bg: 'bg-amber-500/10' },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <button
              key={label}
              onClick={() => navigate('/records')}
              className="bg-white border border-border rounded-2xl p-4 text-left active:scale-95 transition-transform shadow-lg"
            >
              <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center mb-2`}>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <div className="text-base font-black text-foreground leading-tight">RWF {fmt(value)}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{label} ›</div>
            </button>
          ))}
        </div>

        {/* Quick actions */}
        <div className="mx-3 mt-3 bg-white rounded-2xl shadow-sm p-4 border border-border">
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Recharge', icon: ArrowDownToLine, path: '/deposit' },
              { label: 'Withdraw', icon: ArrowUpFromLine, path: '/withdraw' },
              { label: 'Records', icon: ClipboardList, path: '/records' },
            ].map(({ label, icon: Icon, path }) => (
              <button
                key={label}
                onClick={() => navigate(path)}
                className="flex flex-col items-center gap-2 py-2 active:scale-90 transition-transform"
              >
                <div className="w-11 h-11 rounded-2xl bg-primary/8 border border-primary/15 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <span className="text-xs text-foreground font-semibold">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Check-in banner */}
        <div
          className="mx-3 mt-3 rounded-2xl overflow-hidden relative cursor-pointer active:scale-[0.98] transition-transform shadow-lg"
          style={{ height: '90px' }}
          onClick={() => navigate('/checkin')}
        >
          <img
            src="https://images.pexels.com/photos/40248692/pexels-photo-40248692.jpeg?auto=compress&cs=tinysrgb&w=940"
            alt="Fresh bakery treats"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/75 to-black/20" />
          <div className="absolute inset-0 px-4 py-3 flex flex-col justify-center">
            <div className="text-sm font-black text-white mb-0.5">Daily Check-In</div>
            <div className="text-xs text-white/80 mb-2">Check in daily to earn free rewards</div>
            <span className="self-start btn-gold px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1">
              Check in now <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* Menu list */}
        <div className="mx-3 mt-3 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1 h-5 bg-primary rounded-full" />
            <span className="text-sm font-black text-foreground">More</span>
          </div>
          <div className="bg-white border border-border rounded-2xl shadow-sm overflow-hidden">
            {menuItems.map(({ label, icon: Icon, path }, idx) => (
              <button
                key={label}
                onClick={() => navigate(path)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 active:bg-muted transition-colors ${
                  idx !== menuItems.length - 1 ? 'border-b border-border' : ''
                }`}
              >
                <div className="w-9 h-9 rounded-xl bg-primary/8 border border-primary/10 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                <span className="flex-1 text-sm font-semibold text-foreground text-left">{label}</span>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-auto px-4 pb-6 pt-4 text-center">
          <p className="text-xs text-muted-foreground/50">
            By using Al Zain Bakers, you agree to our terms of service. All investment returns are based on the selected VIP plan.
          </p>
          <p className="text-xs text-muted-foreground/50 mt-2 mb-4">
            Al Zain Bakers © {new Date().getFullYear()} · All rights reserved
          </p>
        </div>
      </div>
    </Layout>
  );
}
