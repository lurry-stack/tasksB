import { useEffect, useState, useCallback } from 'react';
import { supabase, fmt, fmtDate, Profile, wrapPassword } from '../../lib/supabase';
import { useToast } from '../../lib/toast';
import { Loader2, Search, ShieldCheck, Trash2, Pencil, X, Key, Inbox, Crown } from 'lucide-react';

type UserVip = {
  id: string;
  plan_name: string;
  investment_amount: number;
  daily_income: number;
  days_paid: number;
  duration_days: number;
  is_active: boolean;
  created_at: string;
};

export function AdminUsers() {
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [editing, setEditing] = useState<Profile | null>(null);
  const [editBalance, setEditBalance] = useState('');
  const [viewingProducts, setViewingProducts] = useState<Profile | null>(null);
  const [userVips, setUserVips] = useState<UserVip[]>([]);
  const [loadingVips, setLoadingVips] = useState(false);
  const [resettingPw, setResettingPw] = useState<Profile | null>(null);
  const [newPassword, setNewPassword] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(300);
    const { data, error } = await q;
    if (error) { toast.error(error.message); setLoading(false); return; }
    let list = (data || []) as Profile[];
    if (search.trim()) {
      const s = search.trim().toLowerCase();
      list = list.filter((p) =>
        p.full_name?.toLowerCase().includes(s) ||
        p.phone?.toLowerCase().includes(s) ||
        p.referral_code?.toLowerCase().includes(s),
      );
    }
    setRows(list);
    setLoading(false);
  }, [search, toast]);

  useEffect(() => { load(); }, [load]);

  const toggleAdmin = async (p: Profile) => {
    const next = !p.is_admin;
    if (!window.confirm(`${next ? 'Grant' : 'Revoke'} admin privileges for ${p.full_name}?`)) return;
    setBusy(p.id);
    const { error } = await supabase.from('profiles').update({ is_admin: next }).eq('id', p.id);
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    toast.success(`${p.full_name} is ${next ? 'now an admin' : 'no longer an admin'}.`);
    load();
  };

  const saveBalance = async () => {
    if (!editing) return;
    setBusy(editing.id);
    const { error } = await supabase.rpc('admin_update_balance', {
      p_user_id: editing.id,
      p_new_balance: Number(editBalance),
    });
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    toast.success('Balance updated');
    setEditing(null);
    load();
  };

  const deleteUser = async (p: Profile) => {
    if (!window.confirm(`Delete ${p.full_name}'s account? This permanently removes their data.`)) return;
    setBusy(p.id);
    const { error } = await supabase.rpc('admin_delete_user', { p_user_id: p.id });
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    toast.success('User deleted');
    load();
  };

  const viewProducts = async (p: Profile) => {
    setViewingProducts(p);
    setLoadingVips(true);
    const { data, error } = await supabase
      .from('user_vips')
      .select('*')
      .eq('user_id', p.id)
      .order('created_at', { ascending: false });
    if (error) { toast.error(error.message); setLoadingVips(false); return; }
    setUserVips((data || []) as UserVip[]);
    setLoadingVips(false);
  };

  const deleteVip = async (vipId: string) => {
    if (!window.confirm('Delete this VIP product?')) return;
    setBusy(vipId);
    const { error } = await supabase.rpc('admin_delete_user_vip', { p_user_vip_id: vipId });
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    toast.success('Product deleted');
    if (viewingProducts) viewProducts(viewingProducts);
  };

  const resetPassword = async () => {
    if (!resettingPw || !newPassword) { toast.error('Enter new password'); return; }
    setBusy(resettingPw.id);
    const fnUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-reset-password`;
    const fnRes = await fetch(fnUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ user_id: resettingPw.id, new_password: wrapPassword(newPassword) }),
    });
    const fnData = await fnRes.json().catch(() => null);
    setBusy(null);
    if (!fnRes.ok || fnData?.error) { toast.error(fnData?.error || 'Failed to reset password'); return; }
    toast.success('Password updated');
    setResettingPw(null);
    setNewPassword('');
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, phone, referral code"
          className="input-field pl-10"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>
      ) : rows.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-border">
          <Inbox className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
          <div className="text-sm text-muted-foreground font-medium">No users found</div>
        </div>
      ) : (
        <div className="space-y-2.5">
          {rows.map((p) => (
            <div key={p.id} className="bg-card border border-border rounded-2xl p-4 shadow-sm premium-card">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2.5 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-primary">{(p.full_name || 'U')[0]}</span>
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-foreground truncate flex items-center gap-1.5">
                      {p.full_name}
                      {p.is_admin && <ShieldCheck className="w-3.5 h-3.5 text-primary shrink-0" />}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">{p.phone || '—'}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      Joined {fmtDate(p.created_at)} · Code: {p.referral_code || '—'}
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm font-black text-foreground">FRW {fmt(p.main_balance || 0)}</div>
                  <div className="text-[10px] text-muted-foreground">Balance</div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                {[
                  { label: 'Deposits', value: fmt(p.total_deposit || 0) },
                  { label: 'Earnings', value: fmt(p.total_earnings || 0) },
                  { label: 'Commission', value: fmt(p.total_referral_commission || 0) },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-muted/40 rounded-xl py-2">
                    <div className="text-xs font-bold text-foreground">{value}</div>
                    <div className="text-[10px] text-muted-foreground">{label}</div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2 mt-3">
                <button
                  onClick={() => { setEditing(p); setEditBalance(String(p.main_balance || 0)); }}
                  className="text-xs font-bold py-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center gap-1.5 active:scale-95 transition-transform hover:bg-primary/15"
                >
                  <Pencil className="w-3.5 h-3.5" /> Edit Balance
                </button>
                <button
                  onClick={() => { setResettingPw(p); setNewPassword(''); }}
                  className="text-xs font-bold py-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center gap-1.5 active:scale-95 transition-transform hover:bg-blue-100"
                >
                  <Key className="w-3.5 h-3.5" /> Reset Password
                </button>
                <button
                  onClick={() => viewProducts(p)}
                  className="text-xs font-bold py-2.5 rounded-xl bg-muted text-foreground border border-border flex items-center justify-center gap-1.5 active:scale-95 transition-transform hover:bg-muted/70"
                >
                  <Crown className="w-3.5 h-3.5" /> View Products
                </button>
                <button
                  onClick={() => toggleAdmin(p)}
                  disabled={busy === p.id}
                  className={`text-xs font-bold py-2.5 rounded-xl disabled:opacity-60 flex items-center justify-center gap-1.5 active:scale-95 transition-transform ${
                    p.is_admin
                      ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100'
                      : 'bg-primary/10 text-primary border border-primary/20 hover:bg-primary/15'
                  }`}
                >
                  {busy === p.id ? <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto" /> : p.is_admin ? 'Revoke Admin' : 'Make Admin'}
                </button>
              </div>
              <button
                onClick={() => deleteUser(p)}
                disabled={busy === p.id}
                className="w-full mt-2 text-xs font-bold py-2.5 rounded-xl bg-red-600 text-white disabled:opacity-60 flex items-center justify-center gap-1.5 active:scale-95 transition-transform hover:bg-red-700"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete Account
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Edit balance modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setEditing(null)}>
          <div className="bg-card rounded-3xl p-5 w-full max-w-sm space-y-4 shadow-2xl animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Pencil className="w-4 h-4 text-primary" />
                </div>
                <span className="text-sm font-bold text-foreground">Edit Balance</span>
              </div>
              <button onClick={() => setEditing(null)} className="p-1.5 rounded-lg hover:bg-muted transition-colors"><X className="w-4 h-4 text-muted-foreground" /></button>
            </div>
            <div className="text-xs text-muted-foreground">{editing.full_name}</div>
            <input
              type="number"
              value={editBalance}
              onChange={(e) => setEditBalance(e.target.value)}
              className="input-field text-lg font-bold"
            />
            <button
              onClick={saveBalance}
              disabled={busy === editing.id}
              className="w-full btn-primary text-sm py-3 flex items-center justify-center gap-2"
            >
              {busy === editing.id ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Save Changes
            </button>
          </div>
        </div>
      )}

      {/* Reset password modal */}
      {resettingPw && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setResettingPw(null)}>
          <div className="bg-card rounded-3xl p-5 w-full max-w-sm space-y-4 shadow-2xl animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Key className="w-4 h-4 text-blue-600" />
                </div>
                <span className="text-sm font-bold text-foreground">Reset Password</span>
              </div>
              <button onClick={() => setResettingPw(null)} className="p-1.5 rounded-lg hover:bg-muted transition-colors"><X className="w-4 h-4 text-muted-foreground" /></button>
            </div>
            <div className="text-xs text-muted-foreground">{resettingPw.full_name}</div>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="New password"
              className="input-field"
            />
            <button
              onClick={resetPassword}
              disabled={busy === resettingPw.id}
              className="w-full btn-primary text-sm py-3 flex items-center justify-center gap-2"
            >
              {busy === resettingPw.id ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Reset Password
            </button>
          </div>
        </div>
      )}

      {/* View products modal */}
      {viewingProducts && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setViewingProducts(null)}>
          <div className="bg-card rounded-3xl p-5 w-full max-w-sm max-h-[80vh] overflow-y-auto space-y-4 shadow-2xl animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Crown className="w-4 h-4 text-primary" />
                </div>
                <span className="text-sm font-bold text-foreground">Products</span>
              </div>
              <button onClick={() => setViewingProducts(null)} className="p-1.5 rounded-lg hover:bg-muted transition-colors"><X className="w-4 h-4 text-muted-foreground" /></button>
            </div>
            <div className="text-xs text-muted-foreground">{viewingProducts.full_name}</div>
            {loadingVips ? (
              <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 text-primary animate-spin" /></div>
            ) : userVips.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm bg-muted/40 rounded-xl">No products</div>
            ) : (
              <div className="space-y-2">
                {userVips.map((v) => (
                  <div key={v.id} className="bg-muted/40 rounded-xl p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-bold">{v.plan_name}</span>
                      <span className={`status-badge ${v.is_active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-muted text-muted-foreground border border-border'}`}>
                        {v.is_active ? 'Active' : 'Expired'}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Investment: FRW {fmt(v.investment_amount)} · Daily: FRW {fmt(v.daily_income)} · Days: {v.days_paid}/{v.duration_days}
                    </div>
                    <button
                      onClick={() => deleteVip(v.id)}
                      disabled={busy === v.id}
                      className="w-full mt-2 text-xs font-bold py-2 rounded-lg bg-red-50 text-red-600 border border-red-200 flex items-center justify-center gap-1.5 disabled:opacity-60 active:scale-95 transition-transform hover:bg-red-100"
                    >
                      {busy === v.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Trash2 className="w-3.5 h-3.5" /> Delete Product</>}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
