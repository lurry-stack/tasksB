import { useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import { useAuth } from '../lib/auth';
import { useRouter } from '../lib/router';
import { supabase, fmt, Settings } from '../lib/supabase';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  ClipboardList,
  CalendarCheck,
  Info,
  ShieldCheck,
  Headphones,
  CheckSquare,
  ChevronRight,
  Megaphone,
  Loader2,
  X,
  Wallet,
  TrendingUp,
  Crown,
} from 'lucide-react';

const bakeryImages = [
  'https://images.pexels.com/photos/32459865/pexels-photo-32459865.jpeg?auto=compress&cs=tinysrgb&w=940',
  'https://images.pexels.com/photos/3639541/pexels-photo-3639541.jpeg?auto=compress&cs=tinysrgb&w=940',
  'https://images.pexels.com/photos/29380150/pexels-photo-29380150.jpeg?auto=compress&cs=tinysrgb&w=940',
  'https://images.pexels.com/photos/40248692/pexels-photo-40248692.jpeg?auto=compress&cs=tinysrgb&w=940',
  'https://images.pexels.com/photos/12800606/pexels-photo-12800606.jpeg?auto=compress&cs=tinysrgb&w=940',
  'https://images.pexels.com/photos/29380155/pexels-photo-29380155.jpeg?auto=compress&cs=tinysrgb&w=940',
];

const banners = bakeryImages.slice(0, 4);
const taskBanner = bakeryImages[4];

const quickActions = [
  { label: 'Recharge', icon: ArrowDownToLine, path: '/deposit' },
  { label: 'Withdraw', icon: ArrowUpFromLine, path: '/withdraw' },
  { label: 'Records', icon: ClipboardList, path: '/records' },
  { label: 'Check In', icon: CalendarCheck, path: '/checkin' },
  { label: 'About Us', icon: Info, path: '/about' },
  { label: 'Regulation', icon: ShieldCheck, path: '/regulation' },
  { label: 'Support', icon: Headphones, path: '/support' },
  { label: 'Task Center', icon: CheckSquare, path: '/tasks' },
];

const partners = [
  { name: 'Fresh Bread', img: bakeryImages[0] },
  { name: 'Pastries', img: bakeryImages[1] },
  { name: 'Artisan Cakes', img: bakeryImages[2] },
  { name: 'Baking Daily', img: bakeryImages[3] },
  { name: 'Sweet Treats', img: bakeryImages[4] },
  { name: 'Al Zain Bakers', img: bakeryImages[5] },
  { name: 'Fresh Daily', img: bakeryImages[0] },
  { name: 'Made With Care', img: bakeryImages[2] },
];

export function HomePage() {
  const { profile, loading } = useAuth();
  const { navigate } = useRouter();
  const [idx, setIdx] = useState(0);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    if (!profile) return;
    supabase.from('settings').select('*').maybeSingle().then(({ data }) => {
      setSettings(data as Settings);
      if (data?.welcome_message && !sessionStorage.getItem('welcome_dismissed')) setShowWelcome(true);
    });
  }, [profile]);

  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % banners.length), 4000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!loading && !profile) navigate('/login', { replace: true });
  }, [loading, profile, navigate]);

  if (loading || !profile) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {showWelcome && settings?.welcome_message && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-scale-in">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Megaphone className="w-5 h-5 text-primary" />
                </div>
                <span className="font-bold text-foreground">Welcome to Al Zain Bakers</span>
              </div>
              <button onClick={() => { setShowWelcome(false); sessionStorage.setItem('welcome_dismissed', '1'); }} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground mb-3">{settings.welcome_message}</p>
            <div className="bg-primary/5 border border-primary/15 rounded-2xl p-3 mb-4">
              <div className="text-xs font-bold text-foreground mb-2">How you make money with Al Zain Bakers:</div>
              <ul className="text-xs text-muted-foreground space-y-1.5">
                <li className="flex gap-2"><span className="text-primary font-bold">1.</span> Buy a VIP plan — earn daily income for the plan duration.</li>
                <li className="flex gap-2"><span className="text-primary font-bold">2.</span> Refer friends — earn commission on their deposits (3 levels).</li>
                <li className="flex gap-2"><span className="text-primary font-bold">3.</span> Complete tasks — earn rewards for each task.</li>
                <li className="flex gap-2"><span className="text-primary font-bold">4.</span> Daily check-in — earn free rewards every day.</li>
              </ul>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowWelcome(false); sessionStorage.setItem('welcome_dismissed', '1'); }}
                className="flex-1 bg-muted text-foreground py-2.5 rounded-xl text-sm font-semibold hover:bg-muted/80 transition-colors"
              >
                Close
              </button>
              {settings.telegram_channel_link && (
                <a
                  href={settings.telegram_channel_link}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 btn-gold py-2.5 rounded-xl text-sm font-semibold text-center flex items-center justify-center gap-1"
                >
                  Join 
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="bg-background min-h-full">
        {/* Banner carousel */}
        <div className="relative w-full overflow-hidden" style={{ height: '200px' }}>
          {banners.map((src, i) => (
            <img
              key={src}
              src={src}
              alt="Al Zain Bakers bakery"
              className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700"
              style={{ opacity: i === idx ? 1 : 0 }}
            />
          ))}
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/60" />
          <div className="absolute top-3 left-4 flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shadow-lg bg-gradient-green border border-white/20">
              <span className="text-white text-[9px] font-black">AZB</span>
            </div>
            <span className="text-white font-black text-sm tracking-widest drop-shadow-lg">AL ZAIN BAKERS</span>
          </div>
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {banners.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${i === idx ? 'w-6 bg-primary' : 'w-2 bg-white/40'}`}
              />
            ))}
          </div>
        </div>

        {/* Quick actions */}
        <div className="bg-card px-4 py-5 border-b border-border">
          <div className="grid grid-cols-4 gap-y-4">
            {quickActions.map(({ label, icon: Icon, path }, i) => (
              <button
                key={label}
                onClick={() => navigate(path)}
                className="group flex flex-col items-center gap-2 active:scale-90 transition-all duration-200"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <div className="w-12 h-12 rounded-2xl bg-primary/8 border border-primary/15 flex items-center justify-center group-hover:bg-primary/12 group-hover:scale-105 transition-all duration-200">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <span className="text-[11px] text-foreground font-semibold leading-tight text-center whitespace-nowrap">
                  {label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Announcement marquee */}
        <div className="bg-muted/60 px-3 py-2 flex items-center gap-2 overflow-hidden border-b border-border">
          <Megaphone className="w-3.5 h-3.5 text-primary shrink-0" />
          <div className="overflow-hidden flex-1">
            <p className="marquee-inner text-[11px] text-muted-foreground">
              {settings?.announcement || 'Welcome to Al Zain Bakers! Earn 7% daily income with our premium plans.'}
            </p>
          </div>
        </div>

        {/* Task center banner */}
        <div
          className="mx-3 my-4 rounded-2xl overflow-hidden relative cursor-pointer active:scale-[0.98] transition-transform shadow-lg"
          style={{ height: '120px' }}
          onClick={() => navigate('/tasks')}
        >
          <img src={taskBanner} alt="Al Zain Bakers fresh pastries" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/55 to-transparent" />
          <div className="absolute inset-0 px-4 py-3 flex flex-col justify-center">
            <div className="text-base font-black text-white mb-1">Referral Leaderboard</div>
            <div className="text-xs text-white/80 mb-2">Refer friends, climb the leaderboard, win weekly rewards</div>
            <span className="self-start bg-primary text-white px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 shadow-md">
              Enter <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* Balance cards */}
        <div className="mx-3 mb-4 grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl p-4 relative overflow-hidden border border-border shadow-md">
            <div className="absolute top-0 right-0 w-20 h-20 rounded-full bg-primary/5 -translate-y-8 translate-x-8" />
            <div className="relative">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                <Wallet className="w-4 h-4 text-primary" />
              </div>
              <div className="text-lg font-black text-foreground leading-tight">RWF {fmt(profile.main_balance || 0)}</div>
              <div className="text-xs text-muted-foreground mt-0.5">Account Balance</div>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-4 relative overflow-hidden border border-border shadow-md">
            <div className="absolute top-0 right-0 w-20 h-20 rounded-full bg-amber-500/5 -translate-y-8 translate-x-8" />
            <div className="relative">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center mb-2">
                <TrendingUp className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-lg font-black text-foreground leading-tight">RWF {fmt(profile.total_earnings || 0)}</div>
              <div className="text-xs text-muted-foreground mt-0.5">Total Earnings</div>
            </div>
          </div>
        </div>

        {/* Partners */}
        <div className="mx-3 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1 h-5 bg-primary rounded-full" />
            <span className="text-sm font-black text-foreground">Our Partners</span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {partners.map((p) => (
              <div key={p.name} className="bg-white border border-border rounded-xl overflow-hidden flex flex-col items-center shadow-sm hover:shadow-md transition-shadow">
                <div className="w-full" style={{ height: '56px' }}>
                  <img
                    src={p.img}
                    alt={p.name}
                    className="w-full h-full object-cover"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                </div>
                <div className="w-full px-1 py-1 text-center text-[10px] font-black text-gray-700 leading-tight truncate">
                  {p.name}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* VIP CTA */}
        <div
          className="mx-3 mb-6 rounded-2xl p-5 cursor-pointer active:scale-[0.98] transition-transform shadow-xl relative overflow-hidden bg-gradient-hero"
          onClick={() => navigate('/vip')}
        >
          <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/5" />
          <div className="absolute -bottom-12 -left-8 w-32 h-32 rounded-full bg-white/5" />
          <div className="relative flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Crown className="w-5 h-5 text-amber-300" />
                <div className="text-base font-black text-sky-300">AL ZAIN PLANS</div>
              </div>
              <div className="text-xs text-white/80 mt-0.5">Grow with Al Zain Bakers plans</div>
            </div>
            <div className="bg-white/10 border border-white/20 rounded-full px-4 py-2 text-white text-xs font-bold flex items-center gap-1 backdrop-blur-sm">
              View <ChevronRight className="w-3 h-3" />
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
