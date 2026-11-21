import { useEffect, useState, useCallback } from 'react';
import { supabase, fmt, VipPlan } from '../../lib/supabase';
import { useToast } from '../../lib/toast';
import { Loader2, Plus, Pencil, Trash2, X, Crown, Inbox } from 'lucide-react';

const empty: Omit<VipPlan, 'id'> = {
  name: '', investment_amount: 0, daily_income: 0, duration_days: 60,
  total_return: 0, sort_order: 0, is_active: true,
};

export function AdminVipPlans() {
  const toast = useToast();
  const [rows, setRows] = useState<VipPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<VipPlan | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<Omit<VipPlan, 'id'>>(empty);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('vip_plans').select('*').order('sort_order', { ascending: true });
    if (error) { toast.error(error.message); setLoading(false); return; }
    setRows((data || []) as VipPlan[]);
    setLoading(false);
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const startEdit = (p: VipPlan) => {
    setEditing(p);
    setForm({
      name: p.name, investment_amount: p.investment_amount, daily_income: p.daily_income,
      duration_days: p.duration_days, total_return: p.total_return,
      sort_order: p.sort_order, is_active: p.is_active,
    });
    setCreating(false);
  };

  const startCreate = () => {
    setCreating(true);
    setEditing(null);
    setForm(empty);
  };

  const cancel = () => { setEditing(null); setCreating(false); };

  const save = async () => {
    if (!form.name) { toast.error('Name required'); return; }
    setBusy(true);
    if (editing) {
      const { error } = await supabase.from('vip_plans').update(form).eq('id', editing.id);
      setBusy(false);
      if (error) { toast.error(error.message); return; }
      toast.success('Plan updated');
    } else {
      const { error } = await supabase.from('vip_plans').insert(form);
      setBusy(false);
      if (error) { toast.error(error.message); return; }
      toast.success('Plan created');
    }
    cancel();
    load();
  };

  const remove = async (p: VipPlan) => {
    if (!window.confirm(`Delete plan "${p.name}"? This cannot be undone.`)) return;
    setBusy(true);
    const { error } = await supabase.from('vip_plans').delete().eq('id', p.id);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Plan deleted');
    load();
  };

  return (
    <div className="space-y-3">
      <button
        onClick={startCreate}
        className="w-full btn-primary text-sm py-3 flex items-center justify-center gap-2"
      >
        <Plus className="w-4 h-4" /> Add Plan
      </button>

      {(editing || creating) && (
        <div className="bg-white border-2 border-primary/30 rounded-2xl p-4 space-y-3 shadow-md animate-scale-in">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-foreground">{editing ? 'Edit Plan' : 'New Plan'}</span>
            <button onClick={cancel} className="p-1.5 rounded-lg hover:bg-muted transition-colors"><X className="w-4 h-4 text-muted-foreground" /></button>
          </div>
          <Field label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
          <div className="grid grid-cols-2 gap-2">
            <Field label="Investment" type="number" value={String(form.investment_amount)} onChange={(v) => setForm({ ...form, investment_amount: Number(v) })} />
            <Field label="Daily Income" type="number" value={String(form.daily_income)} onChange={(v) => setForm({ ...form, daily_income: Number(v) })} />
            <Field label="Duration (days)" type="number" value={String(form.duration_days)} onChange={(v) => setForm({ ...form, duration_days: Number(v) })} />
            <Field label="Total Return" type="number" value={String(form.total_return)} onChange={(v) => setForm({ ...form, total_return: Number(v) })} />
            <Field label="Sort Order" type="number" value={String(form.sort_order)} onChange={(v) => setForm({ ...form, sort_order: Number(v) })} />
            <label className="flex items-center gap-2 text-sm text-foreground mt-5">
              <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="w-4 h-4 rounded accent-primary" />
              Active
            </label>
          </div>
          <button
            onClick={save}
            disabled={busy}
            className="w-full btn-primary text-sm py-3 flex items-center justify-center gap-2"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {editing ? 'Save Changes' : 'Create Plan'}
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 text-primary animate-spin" /></div>
      ) : rows.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-border">
          <Inbox className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
          <div className="text-sm text-muted-foreground font-medium">No plans yet</div>
        </div>
      ) : (
        <div className="space-y-2.5">
          {rows.map((p) => (
            <div key={p.id} className="bg-white border border-border rounded-2xl p-4 shadow-sm premium-card">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Crown className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-foreground flex items-center gap-1.5">
                      {p.name}
                      {!p.is_active && <span className="status-badge bg-muted text-muted-foreground border border-border">Inactive</span>}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Invest FRW {fmt(p.investment_amount)} · {fmt(p.daily_income)}/day · {p.duration_days}d
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      Total return: FRW {fmt(p.total_return)} · Order: {p.sort_order}
                    </div>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => startEdit(p)} className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/15 active:scale-90 transition-transform hover:bg-primary/15"><Pencil className="w-3.5 h-3.5" /></button>
                  <button onClick={() => remove(p)} className="p-2 rounded-xl bg-red-50 text-red-600 border border-red-200 active:scale-90 transition-transform hover:bg-red-100"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="text-[11px] text-muted-foreground font-semibold block mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input-field"
      />
    </div>
  );
}
