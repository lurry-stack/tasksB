import { useState, useEffect } from 'react';
import { supabase, wrapPassword } from '../lib/supabase';
import { useRouter } from '../lib/router';
import { useToast } from '../lib/toast';
import { Loader2, Eye, EyeOff, Phone, Lock } from 'lucide-react';

export const phoneToEmail = (phone: string) => `${phone.replace(/[^0-9]/g, '')}@dubai.app`;

export function LoginPage() {
  const { navigate } = useRouter();
  const toast = useToast();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate('/home', { replace: true });
    });
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || !password) {
      toast.error('Please fill all fields');
      return;
    }
    setLoading(true);
    const email = phoneToEmail(phone);
    // Try the wrapped password first (new accounts). If that fails, fall back
    // to the raw password so accounts created before the suffix change still work.
    const attempts = [wrapPassword(password), password];
    let lastError: Error | null = null;
    let success = false;
    try {
      for (const pw of attempts) {
        const timeout = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Request timed out. Check your connection and try again.')), 15000)
        );
        const result = await Promise.race([
          supabase.auth.signInWithPassword({ email, password: pw }),
          timeout,
        ]) as Awaited<ReturnType<typeof supabase.auth.signInWithPassword>>;
        if (!result.error) { success = true; break; }
        lastError = result.error;
        // Only retry on invalid credentials; bail on other errors (rate limit, etc.)
        if (!/invalid login credentials/i.test(result.error.message)) break;
      }
    } catch (e) {
      lastError = e as Error;
    }
    setLoading(false);
    if (!success) {
      toast.error(lastError?.message || 'Invalid login credentials');
      return;
    }
    toast.success('Welcome back!');
    navigate('/home', { replace: true });
  };

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center relative overflow-hidden px-4 py-6 bg-gradient-hero">
      <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'repeating-linear-gradient(45deg, #fff 0, #fff 1px, transparent 0, transparent 50%)', backgroundSize: '12px 12px' }} />
      <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-primary/20 blur-3xl animate-float" />
      <div className="absolute -bottom-20 -left-20 w-72 h-72 rounded-full bg-blue-400/15 blur-3xl animate-float" style={{ animationDelay: '1.5s' }} />

      <div className="relative w-full max-w-sm space-y-5 animate-fade-in-up">
        <div className="flex flex-col items-center gap-2.5 mb-1">
          <div className="w-16 h-16 rounded-3xl flex items-center justify-center shadow-2xl bg-gradient-green border-2 border-white/20">
            <span className="text-white text-xl font-black tracking-tight">AZB</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-widest drop-shadow-lg font-display text-center">
            AL ZAIN BAKERS
          </h1>
          <p className="text-white/70 text-xs sm:text-sm font-medium tracking-wide text-center">
            Earn up to 192,000 RWF daily
          </p>
        </div>

        <form onSubmit={submit} className="bg-white/95 backdrop-blur-xl rounded-3xl p-5 space-y-4 shadow-2xl border border-white/20">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-500 block">Phone Number</label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+250 7XX XXX XXX"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-800 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-500 block">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={show ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-10 py-3 text-sm text-slate-800 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl py-3.5 font-black text-base flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-transform disabled:opacity-60 btn-primary min-h-[48px]"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Sign In'}
          </button>
          <div className="text-center text-sm text-slate-500">
            No account?{' '}
            <button
              type="button"
              onClick={() => navigate('/register')}
              className="font-bold text-primary hover:underline"
            >
              Register
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
