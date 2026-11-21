import { useEffect, useState, useCallback } from 'react';
import { Layout } from '../components/Layout';
import { useAuth } from '../lib/auth';
import { useRouter } from '../lib/router';
import { useToast } from '../lib/toast';
import { supabase, fmt, fmtDate, maskPhone } from '../lib/supabase';
import { Users, Copy, Share2, ChevronRight, Info, UserPlus, Layers } from 'lucide-react';

type LevelMember = { id: string; full_name: string; phone: string | null; created_at: string; total_deposit: number };
type Commission = { id: string; level: number; commission_amount: number; created_at: string; source_user: { full_name: string; phone: string | null } | null };

export function TeamPage() {
  const { profile } = useAuth();
  const { navigate } = useRouter();
  const toast = useToast();
  const [level, setLevel] = useState(1);
  const [members, setMembers] = useState<{ level1: LevelMember[]; level2: LevelMember[]; level3: LevelMember[] }>({ level1: [], level2: [], level3: [] });
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    const { data: l1 } = await supabase.from('profiles').select('id, full_name, phone, created_at, total_deposit').eq('referred_by', profile.id);
    const l1Ids = ((l1 || []) as LevelMember[]).map((m) => m.id);
    let l2: LevelMember[] = [];
    if (l1Ids.length) {
      const { data } = await supabase.from('profiles').select('id, full_name, phone, created_at, total_deposit').in('referred_by', l1Ids);
      l2 = (data || []) as LevelMember[];
    }
    const l2Ids = l2.map((m) => m.id);
    let l3: LevelMember[] = [];
    if (l2Ids.length) {
      const { data } = await supabase.from('profiles').select('id, full_name, phone, created_at, total_deposit').in('referred_by', l2Ids);
      l3 = (data || []) as LevelMember[];
    }
    setMembers({ level1: (l1 || []) as LevelMember[], level2: l2, level3: l3 });
    const { data: comms } = await supabase
      .from('referral_commissions')
      .select('id, level, commission_amount, created_at, source_user:source_user_id(full_name, phone)')
      .eq('earner_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(50);
    setCommissions((comms || []) as unknown as Commission[]);
    setLoading(false);
  }, [profile]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!profile) navigate('/login', { replace: true });
  }, [profile, navigate]);

  if (!profile) return null;

  const refLink = `${window.location.origin}/register?ref=${profile.referral_code}`;
  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => toast.success(`${label} copied!`));
  };
  const share = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Join Al Zain Bakers',
        text: `Join me on Al Zain Bakers and grow with our daily earning plans! Use my referral code: ${profile.referral_code}`,
        url: refLink,
      }).catch(() => copy(refLink, 'Referral link'));
    } else {
      copy(refLink, 'Referral link');
    }
  };

  const current = members[`level${level}` as keyof typeof members];
  const totalMembers = members.level1.length + members.level2.length + members.level3.length;
  const activeMembers = [...members.level1, ...members.level2, ...members.level3].filter((m) => m.total_deposit > 0).length;

  const levelInfo = [
    { label: 'Level 1', count: members.level1.length, pct: '20%', color: 'from-blue-500 to-blue-700' },
    { label: 'Level 2', count: members.level2.length, pct: '1%', color: 'from-sky-500 to-blue-600' },
    { label: 'Level 3', count: members.level3.length, pct: '1%', color: 'from-blue-400 to-cyan-500' },
  ];

  return (
    <Layout>
      <div className="px-4 pt-5 pb-4">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <h1 className="text-xl font-black gradient-text font-display">My Team</h1>
        </div>

        {/* Level summary */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {levelInfo.map(({ label, count, pct, color }) => (
            <div key={label} className="bg-white rounded-2xl p-3 text-center border border-border shadow-sm premium-card">
              <div className={`text-xs font-bold text-white px-2 py-0.5 rounded-md bg-gradient-to-r ${color} inline-block mb-2`}>
                {label}
              </div>
              <div className="text-2xl font-black text-foreground">{count}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">{pct} commission</div>
            </div>
          ))}
        </div>

        {/* Stats */}
        <div className="bg-white rounded-2xl p-4 mb-4 border border-border shadow-sm">
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Total Members', value: totalMembers, icon: Users },
              { label: 'Active Members', value: activeMembers, icon: UserPlus },
              { label: 'Total Referral Commission', value: `RWF ${fmt(profile.total_referral_commission || 0)}`, span: 2, icon: Layers },
            ].map((s) => (
              <div key={s.label} className={`bg-muted/40 rounded-xl p-3 ${s.span === 2 ? 'col-span-2' : ''}`}>
                <div className="flex items-center gap-1.5 mb-1">
                  <s.icon className="w-3.5 h-3.5 text-primary" />
                  <div className="text-xs text-muted-foreground">{s.label}</div>
                </div>
                <div className="text-lg font-black text-foreground">{s.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Invite */}
        <div className="bg-white rounded-2xl p-4 mb-4 border border-border shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <UserPlus className="w-4 h-4 text-primary" />
            <span className="text-sm font-bold text-foreground">Invite Friends</span>
          </div>
          <div className="flex items-center gap-2 mb-2">
            <div className="flex-1 bg-muted/50 rounded-xl px-3 py-2.5 text-sm text-foreground font-mono font-bold">
              {profile.referral_code || '—'}
            </div>
            <button
              onClick={() => copy(profile.referral_code || '', 'Referral code')}
              className="p-2.5 bg-primary/10 rounded-xl border border-primary/20 active:scale-90 transition-transform"
            >
              <Copy className="w-4 h-4 text-primary" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-muted/50 rounded-xl px-3 py-2.5 text-xs text-muted-foreground truncate">{refLink}</div>
            <button
              onClick={() => copy(refLink, 'Referral link')}
              className="p-2.5 bg-primary/10 rounded-xl border border-primary/20 active:scale-90 transition-transform"
            >
              <Copy className="w-4 h-4 text-primary" />
            </button>
            <button onClick={share} className="p-2.5 bg-primary/10 rounded-xl border border-primary/20 active:scale-90 transition-transform">
              <Share2 className="w-4 h-4 text-primary" />
            </button>
          </div>
        </div>

        {/* Commission rules */}
        <div className="bg-amber-50/60 border border-amber-200/60 rounded-2xl p-4 mb-4 text-xs text-amber-800 space-y-2">
          <div className="flex items-center gap-1.5 font-bold mb-1">
            <Info className="w-3.5 h-3.5" />
            <span>Commission Rules</span>
          </div>
          <div className="flex items-start gap-1.5">
            <span className="text-primary font-bold shrink-0">L1:</span>
            <span>You earn <span className="font-bold">20%</span> when your direct referral deposits.</span>
          </div>
          <div className="flex items-start gap-1.5">
            <span className="text-primary font-bold shrink-0">L2:</span>
            <span>You earn <span className="font-bold">1%</span> when their referral deposits.</span>
          </div>
          <div className="flex items-start gap-1.5">
            <span className="text-primary font-bold shrink-0">L3:</span>
            <span>You earn <span className="font-bold">1%</span> when their referral deposits.</span>
          </div>
        </div>

        {/* Level tabs */}
        <div className="mb-4">
          <div className="flex gap-2 mb-3">
            {[1, 2, 3].map((l) => (
              <button
                key={l}
                onClick={() => setLevel(l)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  level === l ? 'btn-gold' : 'bg-white border border-border text-muted-foreground hover:bg-muted'
                }`}
              >
                Level {l} ({members[`level${l}` as keyof typeof members].length})
              </button>
            ))}
          </div>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : current.length === 0 ? (
            <div className="text-center py-10 bg-white rounded-2xl border border-border">
              <Users className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
              <div className="text-sm text-muted-foreground font-medium">No Level {level} members yet</div>
              <div className="text-xs text-muted-foreground/70 mt-1">Invite friends to grow your team!</div>
            </div>
          ) : (
            <div className="space-y-2">
              {current.map((m) => (
                <div key={m.id} className="flex items-center justify-between bg-white rounded-xl px-4 py-3 border border-border shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-primary">{(m.full_name || 'U')[0]}</span>
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-foreground">{m.full_name || 'User'}</div>
                      <div className="text-xs text-muted-foreground">{maskPhone(m.phone)} · {fmtDate(m.created_at)}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-muted-foreground">Deposit</div>
                    <div className="text-sm font-bold text-primary">RWF {fmt(m.total_deposit)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Commission history */}
        <button
          onClick={() => setShowHistory((s) => !s)}
          className="w-full flex items-center justify-between bg-white border border-border rounded-2xl px-4 py-3.5 text-sm font-bold text-foreground mb-2 shadow-sm active:scale-[0.99] transition-transform"
        >
          <span className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-primary" />
            Commission History
          </span>
          <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${showHistory ? 'rotate-90' : ''}`} />
        </button>
        {showHistory && (
          <div className="space-y-2 mb-4 animate-fade-in">
            {commissions.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground text-sm bg-white rounded-xl border border-border">No commissions yet</div>
            ) : (
              commissions.map((c) => (
                <div key={c.id} className="flex items-center justify-between bg-white rounded-xl px-4 py-3 border border-border shadow-sm">
                  <div>
                    <div className="text-xs font-semibold text-foreground">Level {c.level} Commission</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      From: {c.source_user?.full_name || 'User'} · {fmtDate(c.created_at)}
                    </div>
                  </div>
                  <div className="text-sm font-black text-primary">+{fmt(c.commission_amount)} RWF</div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
