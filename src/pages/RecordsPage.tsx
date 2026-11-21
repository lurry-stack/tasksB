import { useEffect, useState } from 'react';
import { Loader2, ArrowDownToLine, ArrowUpFromLine, Receipt, CheckCircle2, XCircle, Clock, Inbox } from 'lucide-react';
import { Layout, PageHeader } from '../components/Layout';
import { useAuth } from '../lib/auth';
import { useRouter } from '../lib/router';
import { supabase, Deposit, Withdrawal, Transaction, fmt, fmtDate } from '../lib/supabase';

type Tab = 'all' | 'deposits' | 'withdrawals' | 'transactions';

const tabs: { key: Tab; label: string; icon: typeof Receipt }[] = [
  { key: 'all', label: 'All', icon: Receipt },
  { key: 'deposits', label: 'Deposits', icon: ArrowDownToLine },
  { key: 'withdrawals', label: 'Withdrawals', icon: ArrowUpFromLine },
  { key: 'transactions', label: 'Transactions', icon: Clock },
];

export function RecordsPage() {
  const { profile } = useAuth();
  const { navigate } = useRouter();
  const [tab, setTab] = useState<Tab>('all');
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      const [d, w, t] = await Promise.all([
        supabase.from('deposits').select('*').eq('user_id', profile.id).order('created_at', { ascending: false }).limit(50),
        supabase.from('withdrawals').select('*').eq('user_id', profile.id).order('created_at', { ascending: false }).limit(50),
        supabase.from('transactions').select('*').eq('user_id', profile.id).order('created_at', { ascending: false }).limit(100),
      ]);
      setDeposits((d.data || []) as Deposit[]);
      setWithdrawals((w.data || []) as Withdrawal[]);
      setTransactions((t.data || []) as Transaction[]);
      setLoading(false);
    })();
  }, [profile]);

  useEffect(() => {
    if (!profile) navigate('/login', { replace: true });
  }, [profile, navigate]);

  if (!profile) return null;

  if (loading) {
    return (
      <Layout>
        <PageHeader title="Records" />
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
        </div>
      </Layout>
    );
  }

  const statusBadge = (s: string) => {
    const sl = (s || '').toLowerCase();
    if (sl === 'approved' || sl === 'completed' || sl === 'paid')
      return <span className="status-badge bg-emerald-50 text-emerald-700 border border-emerald-200"><CheckCircle2 className="w-3 h-3" />{s}</span>;
    if (sl === 'rejected' || sl === 'failed')
      return <span className="status-badge bg-red-50 text-red-700 border border-red-200"><XCircle className="w-3 h-3" />{s}</span>;
    return <span className="status-badge bg-amber-50 text-amber-700 border border-amber-200"><Clock className="w-3 h-3" />{s}</span>;
  };

  const txSign = (type: string) => {
    const positive = ['checkin', 'redeem', 'vip_income', 'commission', 'referral', 'deposit'];
    const negative = ['withdrawal', 'vip_purchase'];
    const sl = (type || '').toLowerCase();
    if (positive.some((p) => sl.includes(p))) return '+';
    if (negative.some((n) => sl.includes(n))) return '-';
    return '';
  };

  const isEmpty = deposits.length === 0 && withdrawals.length === 0 && transactions.length === 0;

  return (
    <Layout>
      <PageHeader title="Records" />
      <div className="p-4">
        {/* Tab pills */}
        <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                tab === key ? 'btn-gold' : 'bg-white border border-border text-muted-foreground hover:bg-muted'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        {isEmpty ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
              <Inbox className="w-8 h-8 text-muted-foreground/50" />
            </div>
            <div className="text-sm font-semibold text-muted-foreground">No records yet</div>
            <div className="text-xs text-muted-foreground/70 mt-1">Your transaction history will appear here</div>
          </div>
        ) : (
          <div className="space-y-5">
            {(tab === 'all' || tab === 'deposits') && (
              <section>
                <div className="flex items-center gap-2 mb-2">
                  <ArrowDownToLine className="w-4 h-4 text-emerald-500" />
                  <span className="text-sm font-bold text-foreground">Deposits</span>
                </div>
                {deposits.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground text-sm bg-white rounded-xl border border-border">No deposits yet</div>
                ) : (
                  <div className="space-y-2">
                    {deposits.map((d) => (
                      <div key={d.id} className="bg-white rounded-xl p-3.5 border border-border shadow-sm flex items-center justify-between">
                        <div className="min-w-0">
                          <div className="text-sm font-bold text-emerald-600">+RWF {fmt(d.amount)}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">{fmtDate(d.created_at)} · {d.bank_name}</div>
                        </div>
                        {statusBadge(d.status)}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {(tab === 'all' || tab === 'withdrawals') && (
              <section>
                <div className="flex items-center gap-2 mb-2">
                  <ArrowUpFromLine className="w-4 h-4 text-red-500" />
                  <span className="text-sm font-bold text-foreground">Withdrawals</span>
                </div>
                {withdrawals.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground text-sm bg-white rounded-xl border border-border">No withdrawals yet</div>
                ) : (
                  <div className="space-y-2">
                    {withdrawals.map((w) => (
                      <div key={w.id} className="bg-white rounded-xl p-3.5 border border-border shadow-sm flex items-center justify-between">
                        <div className="min-w-0">
                          <div className="text-sm font-bold text-red-600">-RWF {fmt(w.amount)}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">{fmtDate(w.created_at)} · {w.bank_name}</div>
                        </div>
                        {statusBadge(w.status)}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {(tab === 'all' || tab === 'transactions') && (
              <section>
                <div className="flex items-center gap-2 mb-2">
                  <Receipt className="w-4 h-4 text-primary" />
                  <span className="text-sm font-bold text-foreground">Transactions</span>
                </div>
                {transactions.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground text-sm bg-white rounded-xl border border-border">No transactions yet</div>
                ) : (
                  <div className="space-y-2">
                    {transactions.map((t) => (
                      <div key={t.id} className="bg-white rounded-xl p-3.5 border border-border shadow-sm flex items-center justify-between">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-foreground truncate">{t.description || t.type}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">{fmtDate(t.created_at)}</div>
                        </div>
                        <div className={`text-sm font-bold ${txSign(t.type) === '+' ? 'text-emerald-600' : txSign(t.type) === '-' ? 'text-red-600' : 'text-foreground'}`}>
                          {txSign(t.type)}RWF {fmt(t.amount)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
