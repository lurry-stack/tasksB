import { useEffect, useState, useCallback } from 'react';
import { Layout } from '../components/Layout';
import { useAuth } from '../lib/auth';
import { useRouter } from '../lib/router';
import { useToast } from '../lib/toast';
import { supabase, VipPlan, UserVip, fmtInt } from '../lib/supabase';
import { Loader2, ChevronRight, Crown, TrendingUp, Calendar, Wallet } from 'lucide-react';

const planImages = [
  'https://images.pexels.com/photos/32459865/pexels-photo-32459865.jpeg?auto=compress&cs=tinysrgb&w=940',
  'https://images.pexels.com/photos/3639541/pexels-photo-3639541.jpeg?auto=compress&cs=tinysrgb&w=940',
  'https://images.pexels.com/photos/29380150/pexels-photo-29380150.jpeg?auto=compress&cs=tinysrgb&w=940',
  'https://images.pexels.com/photos/40248692/pexels-photo-40248692.jpeg?auto=compress&cs=tinysrgb&w=940',
  'https://images.pexels.com/photos/12800606/pexels-photo-12800606.jpeg?auto=compress&cs=tinysrgb&w=940',
  'https://images.pexels.com/photos/29380155/pexels-photo-29380155.jpeg?auto=compress&cs=tinysrgb&w=940',
];

export function VipPage() {
  const { profile, refreshProfile } = useAuth();
  const { navigate } = useRouter();
  const toast = useToast();
  const [plans, setPlans] = useState<VipPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState<string | null>(null);
  const [activeCount, setActiveCount] = useState(0);
  const [myIncome, setMyIncome] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('vip_plans').select('*').eq('is_active', true).order('sort_order');
    setPlans((data || []) as VipPlan[]);
    if (profile) {
      const { data: uv } = await supabase
        .from('user_vips')
        .select('days_paid, daily_income, is_active')
        .eq('user_id', profile.id);
      const list = (uv || []) as UserVip[];
      setActiveCount(list.filter((x) => x.is_active).length);
      setMyIncome(list.reduce((s, x) => s + (x.days_paid || 0) * x.daily_income, 0));
    }
    setLoading(false);
  }, [profile]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!profile) navigate('/login', { replace: true });
  }, [profile, navigate]);

  if (!profile) return null;

  const buy = async (plan: VipPlan) => {
    if ((profile.main_balance || 0) < plan.investment_amount) {
      toast.error(`Insufficient balance. Need RWF ${fmtInt(plan.investment_amount)}`);
      return;
    }
    setBuying(plan.id);
    try {
      const { error } = await supabase.rpc('buy_vip_plan', {
        p_user_id: profile.id,
        p_plan_id: plan.id,
        p_amount: plan.investment_amount,
        p_daily_income: plan.daily_income,
        p_duration_days: plan.duration_days,
        p_total_return: plan.total_return,
        p_plan_name: plan.name,
      });
      if (error) throw error;
      await refreshProfile();
      await load();
      toast.success(`${plan.name} purchased! Complete your daily reviews to earn income right away.`);
    } catch (e: any) {
      toast.error('Purchase failed: ' + e.message);
    }
    setBuying(null);
  };

  return (
    <Layout>
      <div className="bg-background min-h-full">
        {/* Hero header */}
        <div className="relative w-full overflow-hidden" style={{ height: '210px' }}>
          <img
            src="https://images.pexels.com/photos/32459865/pexels-photo-32459865.jpeg?auto=compress&cs=tinysrgb&w=940"
            alt="Al Zain Bakers bakery"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.25) 50%, rgba(0,0,0,0.65) 100%)' }} />
          <div className="absolute top-4 left-0 right-0 flex items-center justify-center gap-2 px-4">
            <span className="text-base sm:text-lg font-black tracking-widest text-white drop-shadow">AL ZAIN</span>
            <span className="text-base sm:text-lg font-black tracking-widest drop-shadow" style={{ color: '#86EFAC' }}>PRODUCTS</span>
          </div>
          <div className="absolute bottom-12 left-0 right-0 flex items-center justify-center gap-1.5 px-2">
            <div className="flex items-center gap-1 bg-black/40 border border-white/30 rounded-full px-2 py-1 backdrop-blur-sm">
              <Calendar className="w-3 h-3 text-white shrink-0" />
              <span className="text-[9px] font-bold text-white whitespace-nowrap">TERM: 365 DAYS</span>
            </div>
            <div
              className="flex items-center gap-1 rounded-full px-2 py-1 backdrop-blur-sm"
              style={{ background: 'rgba(22,163,74,0.85)', border: '1px solid rgba(255,255,255,0.3)' }}
            >
              <TrendingUp className="w-3 h-3 text-white shrink-0" />
              <span className="text-[9px] font-black text-white whitespace-nowrap">INVITATION: 20%</span>
            </div>
            <div className="flex items-center gap-1 bg-black/40 border border-white/30 rounded-full px-2 py-1 backdrop-blur-sm">
              <Wallet className="w-3 h-3 text-white shrink-0" />
              <span className="text-[9px] font-bold text-white whitespace-nowrap">DAILY PROFIT</span>
            </div>
          </div>
          <div className="absolute bottom-2.5 left-0 right-0 flex items-center justify-between gap-2 px-3">
            <div className="min-w-0">
              <div className="text-sm font-black leading-tight" style={{ color: '#86EFAC', textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>
                HIGH SAFETY
              </div>
              <div className="text-[9px] font-bold text-white/80 mt-0.5 leading-tight">100% SECURE INVESTMENT</div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => navigate('/my-products')}
                className="flex items-center gap-1 bg-black/60 border border-white/20 backdrop-blur-sm rounded-full px-2.5 py-1.5 text-white text-[10px] font-black active:scale-95 transition-transform"
              >
                <span>{activeCount}</span>
                <span className="font-semibold hidden xs:inline">My product</span>
                <ChevronRight className="w-3 h-3" />
              </button>
              <button
                onClick={() => navigate('/my-products')}
                className="flex items-center gap-1 bg-black/60 border border-white/20 backdrop-blur-sm rounded-full px-2.5 py-1.5 text-white text-[10px] font-black active:scale-95 transition-transform"
              >
                <span>RWF {fmtInt(myIncome)}</span>
                <span className="font-semibold hidden xs:inline">My income</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          </div>
        ) : (
          <div className="pb-6">
            {plans.map((plan, i) => {
              const isBuying = buying === plan.id;
              const img = planImages[i % planImages.length];
              const canAfford = (profile?.main_balance || 0) >= plan.investment_amount;
              return (
                <div key={plan.id} className="mx-3 mt-3 bg-white rounded-2xl shadow-md border border-border overflow-hidden premium-card">
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Crown className="w-4 h-4 text-primary" />
                      </div>
                      <span className="text-base sm:text-lg font-black text-foreground truncate">{plan.name}</span>
                      <span
                        className="text-[8px] font-black text-white px-1.5 py-0.5 rounded-md ml-auto shrink-0 hidden sm:block"
                        style={{ background: 'linear-gradient(135deg,#16A34A,#166534)' }}
                      >
                        AL ZAIN BAKERS
                      </span>
                    </div>
                    <div className="flex gap-3 items-start">
                      <div className="flex-1 min-w-0 space-y-2">
                        {[
                          { label: 'Price', value: `RWF ${fmtInt(plan.investment_amount)}` },
                          { label: 'Term', value: `${plan.duration_days}-day` },
                          { label: 'Daily income', value: `RWF ${fmtInt(plan.daily_income)}` },
                          { label: 'Total income', value: `RWF ${fmtInt(plan.total_return)}` },
                        ].map(({ label, value }) => (
                          <div key={label} className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">{label}</span>
                            <span className="text-sm font-bold text-foreground">{value}</span>
                          </div>
                        ))}
                      </div>
                      <div className="shrink-0 rounded-xl overflow-hidden bg-gray-100 shadow-sm" style={{ width: '110px', height: '110px' }}>
                        <img src={img} alt={plan.name} className="w-full h-full object-cover" loading="lazy" />
                      </div>
                    </div>
                    <div className="flex justify-end mt-3">
                      <button
                        onClick={() => buy(plan)}
                        disabled={isBuying}
                        className="rounded-xl font-black text-sm px-8 py-2.5 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-60 btn-primary"
                      >
                        {isBuying ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                        {isBuying ? 'Processing...' : 'BUY NOW'}
                      </button>
                    </div>
                    {!canAfford && (
                      <p className="text-xs text-muted-foreground text-right mt-1">
                        Need RWF {fmtInt(plan.investment_amount - (profile?.main_balance || 0))} more →{' '}
                        <button onClick={() => navigate('/deposit')} className="underline font-semibold text-primary">
                          Deposit
                        </button>
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
