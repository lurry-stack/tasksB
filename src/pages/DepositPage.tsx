import { useState, useEffect, useRef } from 'react';
import { Layout, PageHeader } from '../components/Layout';
import { useAuth } from '../lib/auth';
import { useRouter } from '../lib/router';
import { useToast } from '../lib/toast';
import { supabase, fmt, Settings } from '../lib/supabase';
import { Loader2, Smartphone, Check, Upload, Copy, Clock, Wallet } from 'lucide-react';

const providers = [
  { name: 'MTN', color: '#FFCC00', textColor: '#000', desc: 'MTN Mobile Money' },
  { name: 'Airtel', color: '#E40000', textColor: '#fff', desc: 'Airtel Money' },
];

export function DepositPage() {
  const { profile } = useAuth();
  const { navigate } = useRouter();
  const toast = useToast();
  const [amount, setAmount] = useState('');
  const [provider, setProvider] = useState<'MTN' | 'Airtel'>('MTN');
  const [phone, setPhone] = useState('');
  const [mobileMoneyName, setMobileMoneyName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [copied, setCopied] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase.from('settings').select('*').maybeSingle().then(({ data }) => setSettings(data as Settings));
  }, []);

  useEffect(() => {
    if (profile?.phone) setPhone(profile.phone);
    if (profile?.mobile_money_name) setMobileMoneyName(profile.mobile_money_name);
  }, [profile]);

  useEffect(() => {
    if (!profile) navigate('/login', { replace: true });
  }, [profile, navigate]);

  if (!profile) return null;

  const ussdTemplate = provider === 'MTN'
    ? (settings?.mtn_ussd_template || '*182*8*1*101010*{amount}#')
    : (settings?.airtel_ussd_template || '*425*2*101010*{amount}#');
  const destination = provider === 'MTN'
    ? (settings?.mtn_destination || '101010')
    : (settings?.airtel_destination || '101010');
  const ussdCode = ussdTemplate.replace('{amount}', amount || '0');

  const copyUssd = () => {
    navigator.clipboard.writeText(ussdCode).then(() => {
      setCopied(true);
      toast.success('USSD code copied!');
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const uploadScreenshot = async (file: File) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB');
      return;
    }
    setUploading(true);
    const ext = file.name.split('.').pop() || 'jpg';
    const path = `${profile.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from('deposit-screenshots')
      .upload(path, file, { cacheControl: '3600', upsert: false });
    if (error) {
      setUploading(false);
      toast.error(error.message);
      return;
    }
    const { data: urlData } = supabase.storage.from('deposit-screenshots').getPublicUrl(path);
    setScreenshotUrl(urlData.publicUrl);
    setUploading(false);
    toast.success('Screenshot uploaded');
  };

  const submit = async () => {
    const amt = Number(amount);
    const min = settings?.min_deposit || 3000;
    if (!amt || amt < min) {
      toast.error(`Minimum deposit is RWF ${fmt(min)}`);
      return;
    }
    if (!phone || phone.length < 8) {
      toast.error('Enter a valid mobile money phone number');
      return;
    }
    if (!mobileMoneyName.trim()) {
      toast.error('Enter the name registered on your mobile money account');
      return;
    }
    setSubmitting(true);
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ mobile_money_name: mobileMoneyName.trim() })
      .eq('id', profile.id);
    if (profileError) {
      setSubmitting(false);
      toast.error('Could not save your mobile money name. Please try again.');
      return;
    }
    const { error } = await supabase.rpc('request_deposit', {
      p_amount: amt,
      p_bank_name: provider,
      p_account_number: phone,
      p_holder_name: mobileMoneyName.trim(),
      p_screenshot_url: screenshotUrl,
    });
    setSubmitting(false);
    if (error) {
      const message = error.message.toLowerCase().includes('pending')
        ? 'You already have a pending deposit request. Please wait for approval or its 2-hour expiry.'
        : error.message.toLowerCase().includes('minimum')
          ? `Minimum deposit is RWF ${fmt(min)}`
          : 'Could not submit your deposit request. Please try again.';
      toast.error(message);
      return;
    }
    toast.success('Deposit submitted! Admin approval is required within 2 hours.');
    navigate('/records');
  };

  return (
    <Layout>
      <PageHeader title="Recharge" />
      <div className="p-4 space-y-4">
        {/* Balance card */}
        <div className="bg-white rounded-2xl p-5 border border-border shadow-md relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-primary/5 -translate-y-12 translate-x-12" />
          <div className="relative flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Current Balance</div>
              <div className="text-2xl font-black text-foreground">RWF {fmt(profile.main_balance || 0)}</div>
            </div>
          </div>
        </div>

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

        {/* Amount input */}
        <div>
          <div className="text-sm font-bold text-foreground mb-2">Deposit Amount (RWF)</div>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={`Min ${fmt(settings?.min_deposit || 3000)}`}
            className="input-field"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Minimum deposit: {fmt(settings?.min_deposit || 3000)} RWF.
          </p>
        </div>

        {/* Quick amounts */}
        <div className="grid grid-cols-4 gap-2">
          {[3000, 5000, 10000, 25000].map((v) => (
            <button
              key={v}
              onClick={() => setAmount(String(v))}
              className="bg-muted/50 border border-border rounded-xl py-2.5 text-xs font-bold text-foreground active:scale-95 transition-transform hover:bg-primary/5 hover:border-primary/30"
            >
              {fmt(v)}
            </button>
          ))}
        </div>

        {/* USSD Code */}
        <div className="bg-white rounded-2xl p-4 border-2 border-primary/30 shadow-md">
          <div className="flex items-center gap-2 mb-2">
            <Smartphone className="w-4 h-4 text-primary" />
            <span className="text-sm font-bold text-foreground">{provider} USSD Payment Code</span>
          </div>
          <div className="text-xs text-muted-foreground mb-2">
            Dial this code on your phone to pay via {provider} Mobile Money:
          </div>
          <div className="bg-slate-900 rounded-xl p-3 flex items-center justify-between gap-2">
            <code className="text-amber-400 font-mono text-sm font-bold flex-1 break-all">{ussdCode}</code>
            <button
              onClick={copyUssd}
              className="shrink-0 btn-gold rounded-lg p-2 active:scale-90 transition-transform"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
          <div className="text-xs text-muted-foreground mt-2 space-y-0.5">
            <div>Destination: <span className="font-bold text-foreground">{destination}</span></div>
            <div>Amount: <span className="font-bold text-foreground">{amount && Number(amount) > 0 ? `${fmt(Number(amount))} RWF` : 'Enter amount'}</span></div>
          </div>
        </div>

        {/* Phone number */}
        <div>
          <div className="text-sm font-bold text-foreground mb-2">Your Mobile Money Number</div>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+250 7XX XXX XXX"
            className="input-field"
          />
        </div>

        {/* Mobile money account name */}
        <div>
          <div className="text-sm font-bold text-foreground mb-2">Mobile Money Account Name</div>
          <input
            type="text"
            value={mobileMoneyName}
            onChange={(e) => setMobileMoneyName(e.target.value)}
            placeholder="Name registered on your mobile money account"
            className="input-field"
          />
          <p className="text-xs text-muted-foreground mt-1">Enter the name shown on your MTN or Airtel account.</p>
        </div>

        {/* Screenshot upload */}
        <div>
          <div className="text-sm font-bold text-foreground mb-2">Payment Screenshot (Recommended)</div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadScreenshot(f); }}
          />
          {screenshotUrl ? (
            <div className="relative rounded-xl overflow-hidden border-2 border-primary shadow-md">
              <img src={screenshotUrl} alt="Payment screenshot" className="w-full h-40 object-cover" />
              <button
                onClick={() => { setScreenshotUrl(null); if (fileRef.current) fileRef.current.value = ''; }}
                className="absolute top-2 right-2 bg-red-600 text-white rounded-full w-7 h-7 flex items-center justify-center text-xs font-bold shadow-lg active:scale-90 transition-transform"
              >
                X
              </button>
              <div className="absolute bottom-2 left-2 bg-emerald-600 text-white text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1 shadow-md">
                <Check className="w-3 h-3" /> Uploaded
              </div>
            </div>
          ) : (
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="w-full border-2 border-dashed border-border rounded-xl py-6 flex flex-col items-center gap-2 text-muted-foreground active:scale-95 transition-transform disabled:opacity-60 hover:border-primary/40 hover:bg-primary/5"
            >
              {uploading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                    <Upload className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-semibold">Tap to upload payment screenshot</span>
                  <span className="text-[10px]">JPG, PNG up to 5MB</span>
                </>
              )}
            </button>
          )}
        </div>

        <button
          onClick={submit}
          disabled={submitting}
          className="w-full btn-primary py-3.5 text-sm flex items-center justify-center gap-2"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {submitting ? 'Submitting...' : 'Submit Deposit Request'}
        </button>

        <div className="bg-amber-50/60 border border-amber-200/60 rounded-2xl p-3.5 text-amber-800 text-xs flex items-start gap-2">
          <Clock className="w-4 h-4 mt-0.5 shrink-0" />
          <p>Each user can have one pending deposit request at a time. Admin approval must happen within 2 hours; otherwise the request is automatically rejected and you can submit a new one.</p>
        </div>
      </div>
    </Layout>
  );
}
