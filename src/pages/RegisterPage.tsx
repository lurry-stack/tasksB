import { useState, useEffect } from 'react';
import { supabase, wrapPassword } from '../lib/supabase';
import { useRouter } from '../lib/router';
import { useToast } from '../lib/toast';
import { Loader2, Eye, EyeOff, User, Phone, Lock, Gift } from 'lucide-react';
import { phoneToEmail } from './LoginPage';

export function RegisterPage() {
  const { navigate } = useRouter();
  const toast = useToast();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [refCode, setRefCode] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) setRefCode(ref);
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || !password || !fullName) {
      toast.error('Please fill all required fields');
      return;
    }
    setLoading(true);
    const fnUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/signup`;
    const fnRes = await fetch(fnUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ phone, password: wrapPassword(password), full_name: fullName, ref_code: refCode || null }),
    });
    const fnData = await fnRes.json().catch(() => null);
    if (!fnRes.ok || fnData?.error) {
      setLoading(false);
      toast.error(fnData?.error || 'Failed to create account');
      return;
    }
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: phoneToEmail(phone),
      password: wrapPassword(password),
    });
    if (signInError) {
      setLoading(false);
      toast.error('Account created! Please sign in.');
      navigate('/login');
      return;
    }
    setLoading(false);
    toast.success('Account created! Welcome to Al Zain Bakers!');
    navigate('/home', { replace: true });
  };

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center relative overflow-hidden px-4 py-6 bg-gradient-hero">
      <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'repeating-linear-gradient(45deg, #fff 0, #fff 1px, transparent 0, transparent 50%)', backgroundSize: '12px 12px' }} />
      <div className="absolute -top-20 -left-20 w-72 h-72 rounded-full bg-primary/20 blur-3xl animate-float" />
      <div className="absolute -bottom-20 -right-20 w-72 h-72 rounded-full bg-blue-400/15 blur-3xl animate-float" style={{ animationDelay: '1.5s' }} />

      <div className="relative w-full max-w-sm space-y-5 animate-fade-in-up">
        <div className="flex flex-col items-center gap-2.5 mb-1">
          <div className="w-16 h-16 rounded-3xl flex items-center justify-center shadow-2xl bg-gradient-green border-2 border-white/20">
            <span className="text-white text-xl font-black tracking-tight">AZB</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-widest drop-shadow-lg font-display text-center">
            CREATE ACCOUNT
          </h1>
          <p className="text-white/70 text-xs sm:text-sm font-medium tracking-wide text-center">
            Start your investment journey today
          </p>
        </div>

        <form onSubmit={submit} className="bg-white/95 backdrop-blur-xl rounded-3xl p-5 space-y-4 shadow-2xl border border-white/20">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-500 block">Full Name</label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="John Doe"
                autoComplete="name"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-800 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all min-h-[48px]"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-500 block">Phone Number</label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+250 7XX XXX XXX"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-800 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all min-h-[48px]"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-500 block">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={show ? 'text' : 'password'}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="1 character or more"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-10 py-3 text-sm text-slate-800 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all min-h-[48px]"
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
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-500 block">Referral Code (optional)</label>
            <div className="relative">
              <Gift className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                value={refCode}
                onChange={(e) => setRefCode(e.target.value)}
                placeholder="ABCD1234"
                autoCapitalize="characters"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-800 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all min-h-[48px]"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl py-3.5 font-black text-base flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-transform disabled:opacity-60 btn-primary min-h-[48px]"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create Account'}
          </button>
          <div className="text-center text-sm text-slate-500">
            Have an account?{' '}
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="font-bold text-primary hover:underline"
            >
              Sign In
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
