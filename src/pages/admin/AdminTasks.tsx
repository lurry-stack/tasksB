import { useEffect, useState, useCallback } from 'react';
import { supabase, Task } from '../../lib/supabase';
import { useToast } from '../../lib/toast';
import { Loader2, Plus, Pencil, Trash2, X, ListTodo, Inbox } from 'lucide-react';

const empty: Omit<Task, 'id'> = {
  title: '', description: '', reward: 0, image: '',
  is_active: true, sort_order: 0,
};

export function AdminTasks() {
  const toast = useToast();
  const [rows, setRows] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<Omit<Task, 'id'>>(empty);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('tasks').select('*').order('sort_order', { ascending: true });
    if (error) { toast.error(error.message); setLoading(false); return; }
    setRows((data || []) as Task[]);
    setLoading(false);
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const startEdit = (t: Task) => {
    setEditing(t);
    setForm({
      title: t.title, description: t.description || '', reward: t.reward,
      image: t.image || '', is_active: t.is_active, sort_order: t.sort_order,
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
    if (!form.title) { toast.error('Title required'); return; }
    setBusy(true);
    if (editing) {
      const { error } = await supabase.from('tasks').update(form).eq('id', editing.id);
      setBusy(false);
      if (error) { toast.error(error.message); return; }
      toast.success('Task updated');
    } else {
      const { error } = await supabase.from('tasks').insert(form);
      setBusy(false);
      if (error) { toast.error(error.message); return; }
      toast.success('Task created');
    }
    cancel();
    load();
  };

  const remove = async (t: Task) => {
    if (!window.confirm(`Delete task "${t.title}"?`)) return;
    setBusy(true);
    const { error } = await supabase.from('tasks').delete().eq('id', t.id);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Task deleted');
    load();
  };

  return (
    <div className="space-y-3">
      <button
        onClick={startCreate}
        className="w-full btn-primary text-sm py-3 flex items-center justify-center gap-2"
      >
        <Plus className="w-4 h-4" /> Add Task
      </button>

      {(editing || creating) && (
        <div className="bg-white border-2 border-primary/30 rounded-2xl p-4 space-y-3 shadow-md animate-scale-in">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-foreground">{editing ? 'Edit Task' : 'New Task'}</span>
            <button onClick={cancel} className="p-1.5 rounded-lg hover:bg-muted transition-colors"><X className="w-4 h-4 text-muted-foreground" /></button>
          </div>
          <Field label="Title" value={form.title} onChange={(v) => setForm({ ...form, title: v })} />
          <Field label="Description" value={form.description || ''} onChange={(v) => setForm({ ...form, description: v })} multiline />
          <div className="grid grid-cols-2 gap-2">
            <Field label="Reward (FRW)" type="number" value={String(form.reward)} onChange={(v) => setForm({ ...form, reward: Number(v) })} />
            <Field label="Sort Order" type="number" value={String(form.sort_order)} onChange={(v) => setForm({ ...form, sort_order: Number(v) })} />
          </div>
          <Field label="Image URL" value={form.image || ''} onChange={(v) => setForm({ ...form, image: v })} />
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="w-4 h-4 rounded accent-primary" />
            Active
          </label>
          <button
            onClick={save}
            disabled={busy}
            className="w-full btn-primary text-sm py-3 flex items-center justify-center gap-2"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {editing ? 'Save Changes' : 'Create Task'}
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 text-primary animate-spin" /></div>
      ) : rows.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-border">
          <Inbox className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
          <div className="text-sm text-muted-foreground font-medium">No tasks yet</div>
        </div>
      ) : (
        <div className="space-y-2.5">
          {rows.map((t) => (
            <div key={t.id} className="bg-white border border-border rounded-2xl p-4 shadow-sm premium-card">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <ListTodo className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-foreground flex items-center gap-1.5">
                      {t.title}
                      {!t.is_active && <span className="status-badge bg-muted text-muted-foreground border border-border">Inactive</span>}
                    </div>
                    {t.description && <div className="text-xs text-muted-foreground mt-0.5">{t.description}</div>}
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      Reward: FRW {t.reward} · Order: {t.sort_order}
                    </div>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => startEdit(t)} className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/15 active:scale-90 transition-transform hover:bg-primary/15"><Pencil className="w-3.5 h-3.5" /></button>
                  <button onClick={() => remove(t)} className="p-2 rounded-xl bg-red-50 text-red-600 border border-red-200 active:scale-90 transition-transform hover:bg-red-100"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', multiline = false }: { label: string; value: string; onChange: (v: string) => void; type?: string; multiline?: boolean }) {
  return (
    <div>
      <label className="text-[11px] text-muted-foreground font-semibold block mb-1">{label}</label>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className="input-field resize-none"
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="input-field"
        />
      )}
    </div>
  );
}
