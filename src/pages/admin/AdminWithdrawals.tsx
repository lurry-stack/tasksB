import { useEffect, useState, useCallback } from 'react';
import { supabase, fmt, fmtDate, Withdrawal, Profile } from '../../lib/supabase';
import { useToast } from '../../lib/toast';
import { Loader2, CheckCircle2, XCircle, Clock, Search, Inbox } from 'lucide-react';

type WithdrawalWithUser = Withdrawal & { user?: Pick<Profile, 'full_name' | 'phone'> | null };

export function AdminWithdrawals() {
  const toast = useToast();
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState<WithdrawalWithUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase.from('withdrawals').select('*, user:user_id(full_name, phone)').order('created_at', { ascending: false }).limit(200);
    if (filter !== 'all') q = q.eq('status', filter);
    const { data, error } = await q;
    if (error) { toast.error(error.message); setLoading(false); return; }
    let list = (data || []) as WithdrawalWithUser[];
    if (search.trim()) {
      const s = search.trim().toLowerCase();
      list = list.filter((w) =>
        w.user?.full_name?.toLowerCase().includes(s) ||
        w.user?.phone?.toLowerCase().includes(s) ||
        w.bank_name?.toLowerCase().includes(s),
      );
    }
    setRows(list);
    setLoading(false);
  }, [filter, search, toast]);

  useEffect(() => { load(); }, [load]);

  const approve = async (id: string) => {
    setBusy(id);
    const { error } = await supabase.rpc('approve_withdrawal', { p_withdrawal_id: id });
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    toast.success('Withdrawal approved. Balance deducted.');
    load();
  };

  const reject = async (id: string) => {
    const note = window.prompt('Rejection reason (optional):') || 'Rejected by admin';
    setBusy(id);
    const { error } = await supabase.rpc('reject_withdrawal', { p_withdrawal_id: id, p_note: note });
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    toast.success('Withdrawal rejected. Balance refunded.');
    load();
  };

  const statusBadge = (s: string) => {
    if (s === 'approved') return <span className="status-badge bg-emerald-50 text-emerald-700 border border-emerald-200"><CheckCircle2 className="w-3 h-3" />Approved</span>;
    if (s === 'rejected') return <span className="status-badge bg-red-50 text-red-700 border border-red-200"><XCircle className="w-3 h-3" />Rejected</span>;
    return <span className="status-badge bg-amber-50 text-amber-700 border border-amber-200"><Clock className="w-3 h-3" />Pending</span>;
  };

  const filters: ('pending' | 'approved' | 'rejected' | 'all')[] = ['pending', 'approved', 'rejected', 'all'];

  return (
    <div className="space-y-3">
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3.5 py-2 rounded-full text-xs font-bold capitalize whitespace-nowrap transition-all ${
              filter === f ? 'btn-gold' : 'bg-white border border-border text-muted-foreground hover:bg-muted'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="relative">
        <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search user, phone, bank"
          className="input-field pl-10"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>
      ) : rows.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-border">
          <Inbox className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
          <div className="text-sm text-muted-foreground font-medium">No withdrawals found</div>
        </div>
      ) : (
        <div className="space-y-2.5">
          {rows.map((w) => (
            <div key={w.id} className="bg-white border border-border rounded-2xl p-4 shadow-sm premium-card">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-base font-black text-red-600">-FRW {fmt(w.amount)}</div>
                  <div className="text-xs text-emerald-600 font-bold mt-0.5">User receives: FRW {fmt(w.amount - (w.fee || 0))}</div>
                  <div className="text-xs text-muted-foreground">Fee: FRW {fmt(w.fee || 0)} ({w.amount ? `${((w.fee || 0) / w.amount * 100).toFixed(2).replace(/\.00$/, '')}%` : '0%'})</div>
                  <div className="text-xs text-muted-foreground truncate mt-1">
                    {w.user?.full_name || 'Unknown'} · {w.user?.phone || '—'}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    {fmtDate(w.created_at)} · {w.bank_name} · {w.account_number} · {w.holder_name}
                  </div>
                  {w.admin_note && (
                    <div className="text-[11px] text-red-600 mt-1.5 bg-red-50 rounded-lg px-2 py-1">Note: {w.admin_note}</div>
                  )}
                </div>
                {statusBadge(w.status)}
              </div>
              {w.status === 'pending' && (
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => approve(w.id)}
                    disabled={busy === w.id}
                    className="flex-1 bg-emerald-600 text-white text-xs font-bold py-2.5 rounded-xl disabled:opacity-60 flex items-center justify-center gap-1.5 active:scale-95 transition-transform hover:bg-emerald-700"
                  >
                    {busy === w.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><CheckCircle2 className="w-3.5 h-3.5" />Approve</>}
                  </button>
                  <button
                    onClick={() => reject(w.id)}
                    disabled={busy === w.id}
                    className="flex-1 bg-red-600 text-white text-xs font-bold py-2.5 rounded-xl disabled:opacity-60 flex items-center justify-center gap-1.5 active:scale-95 transition-transform hover:bg-red-700"
                  >
                    <XCircle className="w-3.5 h-3.5" />Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
