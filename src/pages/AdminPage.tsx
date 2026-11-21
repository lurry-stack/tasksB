import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../lib/auth';
import { useRouter } from '../lib/router';
import { supabase } from '../lib/supabase';
import {
  ShieldCheck, ArrowLeftRight, Wallet, Users, Crown, ListTodo,
  Settings as SettingsIcon, Loader2, TrendingUp, Clock, CheckCircle2,
  ChevronLeft, Activity,
} from 'lucide-react';
import { AdminDeposits } from './admin/AdminDeposits';
import { AdminWithdrawals } from './admin/AdminWithdrawals';
import { AdminUsers } from './admin/AdminUsers';
import { AdminVipPlans } from './admin/AdminVipPlans';
import { AdminTasks } from './admin/AdminTasks';
import { AdminSettings } from './admin/AdminSettings';

type TabKey =
  | 'overview' | 'deposits' | 'withdrawals' | 'users'
  | 'vip' | 'tasks' | 'settings';

const tabs: { key: TabKey; label: string; icon: typeof ShieldCheck }[] = [
  { key: 'overview', label: 'Overview', icon: TrendingUp },
  { key: 'deposits', label: 'Deposits', icon: ArrowLeftRight },
  { key: 'withdrawals', label: 'Withdrawals', icon: Wallet },
  { key: 'users', label: 'Users', icon: Users },
  { key: 'vip', label: 'VIP Plans', icon: Crown },
  { key: 'tasks', label: 'Tasks', icon: ListTodo },
  { key: 'settings', label: 'Settings', icon: SettingsIcon },
];

type Stats = {
  totalUsers: number;
  pendingDeposits: number;
  pendingWithdrawals: number;
  totalDeposits: number;
  totalWithdrawals: number;
  totalBalance: number;
  activeVips: number;
};

export function AdminPage() {
  const { profile, loading } = useAuth();
  const { navigate } = useRouter();
  const [tab, setTab] = useState<TabKey>('overview');
  const [stats, setStats] = useState<Stats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  const loadStats = useCallback(async () => {
    if (!profile?.is_admin) return;
    setLoadingStats(true);
    try {
      const [users, pendingDep, pendingWd, activeVips, balances] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('deposits').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('withdrawals').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('user_vips').select('id', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('profiles').select('main_balance, total_deposit'),
      ]);
      const totalBalance = (balances.data || []).reduce(
        (s: number, p: any) => s + Number(p.main_balance || 0), 0,
      );
      const totalDeposits = (balances.data || []).reduce(
        (s: number, p: any) => s + Number(p.total_deposit || 0), 0,
      );
      setStats({
        totalUsers: users.count || 0,
        pendingDeposits: pendingDep.count || 0,
        pendingWithdrawals: pendingWd.count || 0,
        totalDeposits,
        totalWithdrawals: 0,
        totalBalance,
        activeVips: activeVips.count || 0,
      });
    } finally {
      setLoadingStats(false);
    }
  }, [profile]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  if (loading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    );
  }

  if (!profile) {
    navigate('/login', { replace: true });
    return null;
  }

  if (!profile.is_admin) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-background px-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
          <ShieldCheck className="w-8 h-8 text-muted-foreground" />
        </div>
        <h1 className="text-lg font-black text-foreground">Admin access only</h1>
        <p className="text-sm text-muted-foreground mt-1">You don't have permission to view this page.</p>
        <button
          onClick={() => navigate('/home', { replace: true })}
          className="mt-5 px-6 py-2.5 rounded-xl btn-primary text-sm font-bold"
        >
          Back to Home
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-background">
      {/* Header */}
      <div className="sticky top-0 z-30 px-4 py-3.5 flex items-center gap-3 text-white bg-gradient-hero shadow-lg">
        <button
          onClick={() => navigate('/profile')}
          className="p-2 -ml-2 rounded-xl hover:bg-white/10 active:scale-90 transition-all"
          aria-label="Back"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2 flex-1">
          <div className="w-8 h-8 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <h1 className="text-base font-black tracking-wide">Admin Panel</h1>
        </div>
      </div>

      {/* Tabs */}
      <div className="sticky top-[57px] z-20 bg-card/95 backdrop-blur-xl border-b border-border">
        <div className="flex gap-1.5 px-3 py-2.5 overflow-x-auto no-scrollbar">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                tab === key
                  ? 'btn-gold'
                  : 'bg-muted text-muted-foreground hover:bg-muted/70'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 max-w-3xl mx-auto">
        {tab === 'overview' && (
          <Overview stats={stats} loading={loadingStats} onRefresh={loadStats} onGo={setTab} />
        )}
        {tab === 'deposits' && <AdminDeposits />}
        {tab === 'withdrawals' && <AdminWithdrawals />}
        {tab === 'users' && <AdminUsers />}
        {tab === 'vip' && <AdminVipPlans />}
        {tab === 'tasks' && <AdminTasks />}
        {tab === 'settings' && <AdminSettings />}
      </div>
    </div>
  );
}

function Overview({
  stats, loading, onRefresh, onGo,
}: {
  stats: Stats | null;
  loading: boolean;
  onRefresh: () => void;
  onGo: (t: TabKey) => void;
}) {
  if (loading && !stats) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    );
  }
  if (!stats) return null;

  const cards = [
    { label: 'Total Users', value: stats.totalUsers, icon: Users, tab: 'users' as TabKey, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Pending Deposits', value: stats.pendingDeposits, icon: Clock, tab: 'deposits' as TabKey, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Pending Withdrawals', value: stats.pendingWithdrawals, icon: Wallet, tab: 'withdrawals' as TabKey, color: 'text-red-600', bg: 'bg-red-50' },
    { label: 'Active VIPs', value: stats.activeVips, icon: Crown, tab: 'vip' as TabKey, color: 'text-primary', bg: 'bg-primary/10' },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {cards.map(({ label, value, icon: Icon, tab, color, bg }) => (
          <button
            key={label}
            onClick={() => onGo(tab)}
            className="bg-white border border-border rounded-2xl p-4 text-left active:scale-[0.98] transition-transform premium-card"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground font-semibold">{label}</span>
              <div className={`w-7 h-7 rounded-lg ${bg} flex items-center justify-center`}>
                <Icon className={`w-3.5 h-3.5 ${color}`} />
              </div>
            </div>
            <div className="text-2xl font-black text-foreground">{value}</div>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl p-4 border border-border shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 rounded-full bg-emerald-500/5 -translate-y-10 translate-x-10" />
          <div className="relative">
            <div className="text-xs text-muted-foreground font-semibold mb-1">Total Deposits Value</div>
            <div className="text-lg font-black text-foreground">FRW {stats.totalDeposits.toLocaleString()}</div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-border shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 rounded-full bg-blue-500/5 -translate-y-10 translate-x-10" />
          <div className="relative">
            <div className="text-xs text-muted-foreground font-semibold mb-1">Total User Balances</div>
            <div className="text-lg font-black text-foreground">FRW {stats.totalBalance.toLocaleString()}</div>
          </div>
        </div>
      </div>

      <button
        onClick={onRefresh}
        className="w-full py-3 rounded-xl bg-white border border-border text-foreground text-sm font-bold flex items-center justify-center gap-2 hover:bg-muted transition-colors"
      >
        <Activity className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        Refresh Stats
      </button>

      <div className="flex items-start gap-2 bg-amber-50/60 border border-amber-200/60 rounded-2xl p-4 text-amber-800 text-xs">
        <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
        <p>
          Approve deposits to credit user balances and trigger referral commissions (20% / 5% / 2%).
          Rejecting a withdrawal refunds the reserved amount to the user.
        </p>
      </div>
    </div>
  );
}
