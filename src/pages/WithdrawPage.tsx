import { useState, useEffect } from 'react';
import { Layout, PageHeader } from '../components/Layout';
import { useAuth } from '../lib/auth';
import { useRouter } from '../lib/router';
import { useToast } from '../lib/toast';
import { supabase, fmt, Settings } from '../lib/supabase';
import { Loader2, Smartphone, Check, Clock, Lock, Wallet } from 'lucide-react';

const providers = [
  { name: 'MTN', color: '#FFCC00', textColor: '#000', desc: 'MTN Mobile Money' },
  { name: 'Airtel', color: '#E40000', textColor: '#fff', desc: 'Airtel Money' },
];

export function WithdrawPage() {
  const { profile, refreshProfile } = useAuth();
  const { navigate } = useRouter();
  const toast = useToast();
  const [amount, setAmount] = useState('');
  const [provider, setProvider] = useState<'MTN' | 'Airtel'>('MTN');
  const [phone, setPhone] = useState('');
  const [holderName, setHolderName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [hasVip, setHasVip] = useState(false);

  useEffect(() => {
    supabase.from('settings').select('*').maybeSingle().then(({ data }) => setSettings(data as Settings));
  }, []);

  useEffect(() => {
    if (profile?.phone) setPhone(profile.phone);
    if (profile?.full_name) setHolderName(profile.full_name);
  }, [profile]);

  useEffect(() => {
    if (!profile) return;
    supabase.from('user_vips').select('id', { count: 'exact', head: true }).eq('user_id', profile.id).then(({ count }) => {
      setHasVip((count || 0) > 0);
    });
  }, [profile]);

  useEffect(() => {
    if (!profile) navigate('/login', { replace: true });
  }, [profile, navigate]);

  if (!profile) return null;

  const minWithdraw = settings?.min_withdraw ?? 1000;
  const withdrawFeePercent = settings?.withdraw_fee_percent ?? 10;
  const arrivalHours = settings?.withdraw_arrival_hours ?? 48;

  const submit = async () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) { toast.error('Enter a valid amount'); return; }
    if (amt < minWithdraw) { toast.error(`Minimum withdrawal is ${fmt(minWithdraw)} RWF`); return; }
    if (amt > (profile.main_balance || 0)) { toast.error('Insufficient balance'); return; }
    if (!phone || phone.length < 8) { toast.error('Enter a valid mobile money phone number'); return; }
    if (!holderName.trim()) { toast.error('Enter the account holder name for payment'); return; }
    if (!hasVip) {
      toast.error('You must purchase at least one product before withdrawing');
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.rpc('request_withdrawal', {
      p_amount: amt,
      p_provider: provider,
      p_phone: phone,
      p_holder_name: holderName.trim(),
    });
    if (error) {
      setSubmitting(false);
      toast.error(error.message);
      return;
    }
    await refreshProfile();
    setSubmitting(false);
    toast.success(`${fmt(amt)} RWF withdrawal requested via ${provider}. Waiting for admin approval.`);
    navigate('/records');
  };

  return (
    <Layout>
      <PageHeader title="Withdraw" />
      <div className="p-4 space-y-4">
        {/* Balance */}
        <div className="bg-white rounded-2xl p-5 border border-border shadow-md relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-primary/5 -translate-y-12 translate-x-12" />
          <div className="relative flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Available Balance</div>
              <div className="text-2xl font-black text-foreground">RWF {fmt(profile.main_balance || 0)}</div>
            </div>
          </div>
        </div>

        {!hasVip && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-3.5 text-red-700 text-xs flex items-start gap-2">
            <Lock className="w-4 h-4 mt-0.5 shrink-0" />
            <p>You must purchase at least one product before you can withdraw. <button onClick={() => navigate('/vip')} className="font-bold underline">Browse VIP Plans</button></p>
          </div>
        )}

        {/* Provider selection */}
        <div>
          <div className="text-sm font-bold text-foreground mb-2">Select Mobile Money Provider</div>
          <div className="grid grid-cols-2 gap-3">
            {providers.map((p) => {
              const selected = provider === p.name;
              return (
                <button
                  key={p.name}
                  onClick={() => setProvider(p.name as 'MTN' | 'Airtel')}
                  className={`rounded-2xl p-4 border-2 transition-all flex flex-col items-center gap-2 ${
                    selected ? 'border-primary bg-primary/5 shadow-md' : 'border-border bg-white'
                  }`}
                >
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center shadow-sm"
                    style={{ backgroundColor: p.color }}
                  >
                    <Smartphone className="w-6 h-6" style={{ color: p.textColor }} />
                  </div>
                  <div className="text-sm font-bold text-foreground">{p.name}</div>
                  <div className="text-[11px] text-muted-foreground">{p.desc}</div>
                  {selected && (
                    <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center animate-scale-in">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Account holder name */}
        <div>
          <div className="text-sm font-bold text-foreground mb-2">Account Holder Name</div>
          <input
            type="text"
            value={holderName}
            onChange={(e) => setHolderName(e.target.value)}
            placeholder="Enter the name registered on your mobile money account"
            className="input-field"
          />
          <p className="text-xs text-muted-foreground mt-1">This name will be sent to the admin for payment verification.</p>
        </div>

        {/* Phone number */}
        <div>
          <div className="text-sm font-bold text-foreground mb-2">Mobile Money Number</div>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+250 7XX XXX XXX"
            className="input-field"
          />
        </div>

        {/* Amount */}
        <div>
          <div className="text-sm font-bold text-foreground mb-2">Withdrawal Amount (RWF)</div>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={`Minimum ${fmt(minWithdraw)}`}
            className="input-field"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Minimum withdrawal: <span className="font-bold text-foreground">{fmt(minWithdraw)} RWF</span>. A <span className="font-bold text-foreground">{withdrawFeePercent}% fee</span> applies.
          </p>
        </div>

        {/* Quick amounts */}
        <div className="grid grid-cols-4 gap-2">
          {[1000, 3000, 10000, 25000].map((v) => (
            <button
              key={v}
              onClick={() => setAmount(String(v))}
              className="bg-muted/50 border border-border rounded-xl py-2.5 text-xs font-bold text-foreground active:scale-95 transition-transform hover:bg-primary/5 hover:border-primary/30"
            >
              {fmt(v)}
            </button>
          ))}
        </div>

        {/* Fee breakdown */}
        {amount && Number(amount) > 0 && (
          <div className="bg-white rounded-2xl p-4 border border-border shadow-sm space-y-2 animate-fade-in">
            <div className="text-xs font-bold text-foreground mb-1">Payment Summary</div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Withdrawal Amount</span>
              <span className="font-bold text-foreground">{fmt(Number(amount))} RWF</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Processing Fee ({withdrawFeePercent}%)</span>
              <span className="font-bold text-red-600">-{fmt(Number(amount) * withdrawFeePercent / 100)} RWF</span>
            </div>
            <div className="border-t border-border pt-2 flex justify-between">
              <span className="text-sm text-foreground font-semibold">You Receive</span>
              <span className="text-lg font-black text-primary">{fmt(Number(amount) - Number(amount) * withdrawFeePercent / 100)} RWF</span>
            </div>
          </div>
        )}

        <button
          onClick={submit}
          disabled={submitting || !hasVip}
          className="w-full btn-primary py-3.5 text-sm flex items-center justify-center gap-2"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {submitting ? 'Processing...' : `Request Withdrawal via ${provider}`}
        </button>

        <div className="bg-yellow-50/60 border border-yellow-200/60 rounded-2xl p-3.5 text-yellow-800 text-xs flex items-start gap-2">
          <Clock className="w-4 h-4 mt-0.5 shrink-0" />
          <p>Withdrawals require admin approval. Your balance is deducted immediately upon request. If rejected, the full amount is refunded. A {withdrawFeePercent}% processing fee is deducted from the withdrawal amount.</p>
        </div>

        <div className="bg-blue-50/60 border border-blue-200/60 rounded-2xl p-3.5 text-blue-700 text-xs flex items-start gap-2">
          <Clock className="w-4 h-4 mt-0.5 shrink-0" />
          <p>Withdrawals are available <span className="font-bold">Monday to Saturday, 07:00 to 13:00</span>. Requests outside this window are not accepted.</p>
        </div>

        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-3.5 text-foreground text-xs flex items-start gap-2">
          <Clock className="w-4 h-4 text-primary mt-0.5 shrink-0" />
          <p className="font-semibold">Withdrawal arrival time: {arrivalHours} hours after admin approval.</p>
        </div>
      </div>
    </Layout>
  );
}
