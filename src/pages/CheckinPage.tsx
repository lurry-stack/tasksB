import { useEffect, useState } from 'react';
import { Layout, PageHeader } from '../components/Layout';
import { useAuth } from '../lib/auth';
import { useRouter } from '../lib/router';
import { useToast } from '../lib/toast';
import { supabase, Checkin, fmt, fmtDate } from '../lib/supabase';
import { Loader2, CalendarCheck, Gift, Flame, Sparkles } from 'lucide-react';

export function CheckinPage() {
  const { profile, refreshProfile } = useAuth();
  const { navigate } = useRouter();
  const toast = useToast();
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [todayChecked, setTodayChecked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    if (!profile) return;
    supabase.from('checkins').select('*').eq('user_id', profile.id).order('created_at', { ascending: false }).limit(30).then(({ data }) => {
      const list = (data || []) as Checkin[];
      setCheckins(list);
      const today = new Date().toDateString();
      setTodayChecked(list.some((c) => new Date(c.created_at).toDateString() === today));
      setLoading(false);
    });
  }, [profile]);

  useEffect(() => {
    if (!profile) navigate('/login', { replace: true });
  }, [profile, navigate]);

  if (!profile) return null;

  const checkin = async () => {
    if (todayChecked) return;
    setClaiming(true);
    const reward = Math.floor(Math.random() * 190) + 10;
    const { error } = await supabase.from('checkins').insert({
      user_id: profile.id,
      reward_amount: reward,
      reward_label: 'Daily check-in',
    });
    if (error) { setClaiming(false); toast.error(error.message); return; }
    await supabase.from('transactions').insert({
      user_id: profile.id,
      type: 'checkin',
      amount: reward,
      description: 'Daily check-in reward',
    });
    await supabase.from('profiles').update({
      main_balance: (profile.main_balance || 0) + reward,
      total_earnings: (profile.total_earnings || 0) + reward,
    }).eq('id', profile.id);
    await refreshProfile();
    setTodayChecked(true);
    setClaiming(false);
    toast.success(`Check-in successful! +RWF ${fmt(reward)}`);
  };

  const streak = checkins.length;

  return (
    <Layout>
      <PageHeader title="Daily Check-In" />
      <div className="p-4 space-y-4">
        {/* Streak card */}
        <div className="rounded-2xl p-6 text-center relative overflow-hidden shadow-xl bg-gradient-hero">
          <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-white/5" />
          <div className="absolute -bottom-12 -left-10 w-32 h-32 rounded-full bg-white/5" />
          <div className="relative">
            <div className={`w-16 h-16 rounded-2xl mx-auto flex items-center justify-center mb-3 ${todayChecked ? 'bg-amber-400/20' : 'bg-white/10'} ${!todayChecked ? 'animate-pulse-glow' : ''}`}>
              {todayChecked ? <Sparkles className="w-8 h-8 text-amber-300" /> : <CalendarCheck className="w-8 h-8 text-white" />}
            </div>
            <div className="text-4xl font-black text-white">{streak}</div>
            <div className="text-xs text-white/70 mt-1 font-medium">
              {todayChecked ? "You've checked in today" : 'Day streak'}
            </div>
          </div>
        </div>

        {/* Check-in button */}
        <button
          onClick={checkin}
          disabled={todayChecked || claiming}
          className="w-full btn-primary py-4 text-base flex items-center justify-center gap-2"
        >
          {claiming ? <Loader2 className="w-5 h-5 animate-spin" /> : todayChecked ? <Sparkles className="w-5 h-5" /> : <Gift className="w-5 h-5" />}
          {todayChecked ? 'Checked in today' : claiming ? 'Checking in...' : 'Check In Now'}
        </button>

        {/* How it works */}
        <div className="bg-white rounded-2xl p-4 border border-border shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-primary" />
            <span className="text-sm font-bold text-foreground">How it works</span>
          </div>
          <ul className="text-xs text-muted-foreground space-y-2">
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
              <span>Each user gets a random reward between 10–199 RWF.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
              <span>All check-in rewards go directly to your main balance.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
              <span>Complete 7 consecutive days for a bonus streak reward.</span>
            </li>
          </ul>
        </div>

        {/* Recent check-ins */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1 h-5 bg-primary rounded-full" />
            <span className="text-sm font-black text-foreground">Recent Check-ins</span>
          </div>
          {loading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
            </div>
          ) : checkins.length === 0 ? (
            <div className="text-center py-10 bg-white rounded-2xl border border-border">
              <CalendarCheck className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
              <div className="text-sm text-muted-foreground font-medium">No check-ins yet</div>
              <div className="text-xs text-muted-foreground/70 mt-1">Check in daily to earn rewards!</div>
            </div>
          ) : (
            <div className="space-y-2">
              {checkins.map((c) => (
                <div key={c.id} className="bg-white rounded-xl p-3 flex items-center justify-between border border-border shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Gift className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-foreground">{c.reward_label || 'Daily check-in'}</div>
                      <div className="text-xs text-muted-foreground">{fmtDate(c.created_at)}</div>
                    </div>
                  </div>
                  <div className="text-sm font-black text-primary">+RWF {fmt(c.reward_amount)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
