import { useCallback, useEffect, useMemo, useState } from 'react';
import { Layout, PageHeader } from '../components/Layout';
import { useAuth } from '../lib/auth';
import { useRouter } from '../lib/router';
import { useToast } from '../lib/toast';
import { supabase, fmt } from '../lib/supabase';
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Crown,
  Info,
  Loader2,
  Medal,
  Share2,
  Star,
  TrendingUp,
  Users,
} from 'lucide-react';

type LeaderboardEntry = {
  user_id: string;
  full_name: string;
  phone: string | null;
  referral_code: string | null;
  referral_count: number;
  total_deposit: number;
};

type UserVip = {
  id: string;
  plan_name: string;
  daily_income: number;
  days_paid: number;
  duration_days: number;
  purchased_at: string;
  last_income_at: string;
  is_active: boolean;
};

type ReviewRow = {
  user_vip_id: string;
  image_index: number;
  rating: number;
};

const reviewImages = [
  '/images/pexels-vovkapanda-15009979.jpg',
  '/images/pexels-valeriya-37924311.jpg',
  '/images/pexels-mert-ocak-1182809874-39575614.jpg',
  '/images/pexels-anthony-rahayel-125801377-30350350.jpg',
  '/images/pexels-jhency-xang-2148325-3789032.jpg',
];

const todayKey = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
};

const sameLocalDay = (value: string | null, date: string) => {
  if (!value) return false;
  const parsed = new Date(value);
  const offset = parsed.getTimezoneOffset() * 60000;
  return new Date(parsed.getTime() - offset).toISOString().slice(0, 10) === date;
};

export function TasksPage() {
  const { profile, refreshProfile } = useAuth();
  const { navigate } = useRouter();
  const toast = useToast();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [myReferrals, setMyReferrals] = useState(0);
  const [products, setProducts] = useState<UserVip[]>([]);
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [step, setStep] = useState(0);
  const [savingReview, setSavingReview] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(true);
  const [claimedProductIds, setClaimedProductIds] = useState<string[]>([]);

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    const [{ data: leaderboardData, error: leaderboardError }, { data: productData }, { data: reviewData }] = await Promise.all([
      supabase.rpc('get_referral_leaderboard', { p_limit: 50 }),
      supabase.from('user_vips').select('id, plan_name, daily_income, days_paid, duration_days, purchased_at, last_income_at, is_active').eq('user_id', profile.id).eq('is_active', true).order('created_at', { ascending: false }),
      supabase.from('vip_daily_reviews').select('user_vip_id, image_index, rating').eq('user_id', profile.id).eq('review_date', todayKey()),
    ]);

    if (leaderboardError) {
      toast.error('Could not load the leaderboard.');
    } else {
      const list = (leaderboardData || []) as LeaderboardEntry[];
      setLeaderboard(list);
      const idx = list.findIndex((entry) => entry.user_id === profile.id);
      setMyRank(idx >= 0 ? idx + 1 : null);
      setMyReferrals(list.find((entry) => entry.user_id === profile.id)?.referral_count || 0);
    }

    const activeProducts = (productData || []) as UserVip[];
    const currentDate = todayKey();
    setProducts(activeProducts);
    setReviews((reviewData || []) as ReviewRow[]);
    setClaimedProductIds(activeProducts.filter((product) => sameLocalDay(product.last_income_at, currentDate)).map((product) => product.id));
    setSelectedProductId((current) => current || activeProducts[0]?.id || '');
    setLoading(false);
    setReviewLoading(false);
  }, [profile, toast]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!profile) navigate('/login', { replace: true });
  }, [profile, navigate]);

  const selectedProduct = useMemo(
    () => products.find((product) => product.id === selectedProductId) || null,
    [products, selectedProductId],
  );

  const selectedReviews = useMemo(
    () => reviews.filter((review) => review.user_vip_id === selectedProductId),
    [reviews, selectedProductId],
  );

  const ratings = useMemo(
    () => Object.fromEntries(selectedReviews.map((review) => [review.image_index, review.rating])) as Record<number, number>,
    [selectedReviews],
  );

  useEffect(() => {
    const firstIncomplete = reviewImages.findIndex((_, index) => !ratings[index]);
    setStep(firstIncomplete >= 0 ? firstIncomplete : reviewImages.length);
  }, [selectedProductId, ratings]);

  if (!profile) return null;

  const claimedToday = selectedProduct ? claimedProductIds.includes(selectedProduct.id) : false;
  const allReviewsComplete = reviewImages.every((_, index) => Boolean(ratings[index]));
  const reviewUnavailable = !selectedProduct || !selectedProduct.is_active || claimedToday;

  const rateImage = async (rating: number) => {
    if (!selectedProduct || savingReview || reviewUnavailable) return;
    setSavingReview(true);
    const { error } = await supabase.rpc('complete_daily_vip_review', {
      p_user_vip_id: selectedProduct.id,
      p_image_index: step,
      p_rating: rating,
    });
    setSavingReview(false);
    if (error) {
      toast.error('This review could not be saved.');
      return;
    }
    setReviews((current) => [
      ...current.filter((review) => !(review.user_vip_id === selectedProduct.id && review.image_index === step)),
      { user_vip_id: selectedProduct.id, image_index: step, rating },
    ]);
    if (step < reviewImages.length - 1) setStep(step + 1);
  };

  const claimIncome = async () => {
    if (!selectedProduct || !allReviewsComplete || claiming || reviewUnavailable) return;
    setClaiming(true);
    const { data, error } = await supabase.rpc('claim_daily_vip_income', { p_user_vip_id: selectedProduct.id });
    setClaiming(false);
    if (error) {
      toast.error('Complete all five reviews before claiming income.');
      return;
    }
    await refreshProfile();
    setClaimedProductIds((current) => [...current, selectedProduct.id]);
    toast.success(`Daily income released: +RWF ${fmt(Number(data || selectedProduct.daily_income))}`);
  };

  const share = async () => {
    const shareData = {
      title: 'Join Al Zain Bakers',
      text: `Join me on Al Zain Bakers and grow with our daily earning plans! Use my referral code: ${profile.referral_code}`,
      url: window.location.origin,
    };
    try {
      if (navigator.share) await navigator.share(shareData);
      else {
        await navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`);
        toast.success('Referral link copied!');
      }
    } catch {
      // User cancelled sharing.
    }
  };

  return (
    <Layout>
      <PageHeader title="Task Center" />
      <div className="p-4 space-y-4">
        <section className="rounded-2xl overflow-hidden border border-amber-200 bg-white shadow-sm">
          <div className="bg-gradient-hero p-5 text-white relative overflow-hidden">
            <div className="absolute -top-10 -right-8 w-32 h-32 rounded-full bg-white/10" />
            <div className="relative flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1"><Star className="w-5 h-5 text-amber-300 fill-amber-300" /><span className="text-base font-black">Daily Product Review</span></div>
                <p className="text-xs text-white/75 leading-relaxed">Review all five bread images to unlock today&apos;s product income.</p>
              </div>
              <div className="shrink-0 rounded-xl bg-white/10 border border-white/15 px-2.5 py-2 text-center"><div className="text-lg font-black">5</div><div className="text-[9px] text-white/70">reviews</div></div>
            </div>
          </div>

          {reviewLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>
          ) : products.length === 0 ? (
            <div className="p-6 text-center"><Crown className="w-9 h-9 text-muted-foreground/30 mx-auto mb-2" /><div className="text-sm font-bold text-foreground">Buy a product to unlock daily reviews</div><button onClick={() => navigate('/vip')} className="mt-3 btn-primary rounded-xl px-5 py-2.5 text-xs font-bold">View Products</button></div>
          ) : (
            <div className="p-4 space-y-4">
              <div className="relative">
                <select value={selectedProductId} onChange={(event) => setSelectedProductId(event.target.value)} className="input-field appearance-none pr-10 font-bold text-foreground">
                  {products.map((product) => <option key={product.id} value={product.id}>{product.plan_name} · RWF {fmt(product.daily_income)}/day</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              </div>

              {claimedToday ? (
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 flex items-center gap-2 text-xs text-emerald-800"><CheckCircle2 className="w-4 h-4" />Today&apos;s income has already been released for this product.</div>
              ) : selectedProduct ? (
                <>
                  <div className="flex items-center justify-between text-xs mb-1"><span className="font-bold text-foreground">Review {Math.min(step + 1, 5)} of 5</span><span className="text-muted-foreground">RWF {fmt(selectedProduct.daily_income)} available</span></div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden"><div className="h-full bg-gradient-green rounded-full transition-all duration-500" style={{ width: `${(selectedReviews.length / 5) * 100}%` }} /></div>
                  {!allReviewsComplete ? (
                    <div key={`${selectedProduct.id}-${step}`} className="animate-fade-in-up pt-2">
                      <div className="rounded-2xl overflow-hidden bg-muted aspect-[4/3] shadow-md"><img src={reviewImages[step]} alt={`Bread review ${step + 1}`} className="w-full h-full object-cover" /></div>
                      <div className="text-center pt-4"><div className="text-sm font-bold text-foreground">How would you rate this bread?</div><div className="text-xs text-muted-foreground mt-1">Choose a rating to continue to the next image.</div><div className="flex justify-center gap-2 mt-3">{[1, 2, 3, 4, 5].map((rating) => <button key={rating} onClick={() => rateImage(rating)} disabled={savingReview} aria-label={`${rating} star rating`} className="p-1.5 rounded-xl hover:bg-amber-50 active:scale-90 transition-all disabled:opacity-50"><Star className="w-8 h-8 text-amber-400 fill-amber-400" /></button>)}</div>{savingReview && <div className="flex justify-center items-center gap-2 text-xs text-muted-foreground mt-2"><Loader2 className="w-3.5 h-3.5 animate-spin" />Saving rating...</div>}</div>
                    </div>
                  ) : (
                    <div className="pt-3 text-center"><div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4"><CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-2" /><div className="text-sm font-black text-emerald-800">All five reviews complete</div><div className="text-xs text-emerald-700 mt-1">Your daily product income is ready to claim.</div></div><button onClick={claimIncome} disabled={claiming} className="w-full btn-primary py-3.5 mt-3 rounded-xl text-sm font-black flex items-center justify-center gap-2">{claiming ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}{claiming ? 'Releasing income...' : `Claim RWF ${fmt(selectedProduct.daily_income)}`}</button></div>
                  )}
                </>
              ) : null}
            </div>
          )}
        </section>

        <div className="bg-white rounded-2xl p-4 border border-border shadow-sm"><div className="flex items-center justify-between mb-3"><div><div className="text-xs text-muted-foreground">Your Referrals</div><div className="text-2xl font-black text-foreground">{myReferrals}</div></div><div className="text-right"><div className="text-xs text-muted-foreground">Your Rank</div><div className="text-2xl font-black text-primary">{myRank ? `#${myRank}` : '—'}</div></div></div><button onClick={share} className="w-full btn-gold rounded-xl py-2.5 text-sm font-bold flex items-center justify-center gap-2"><Share2 className="w-4 h-4" />Share Referral Code: {profile.referral_code || '—'}</button></div>

        <div><div className="flex items-center gap-2 mb-3"><TrendingUp className="w-4 h-4 text-primary" /><span className="text-sm font-bold text-foreground">Top Referrers</span></div>{loading ? <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div> : leaderboard.length === 0 ? <div className="text-center py-10 bg-white rounded-2xl border border-border"><Users className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" /><div className="text-sm text-muted-foreground font-medium">No referrals yet</div><div className="text-xs text-muted-foreground/70 mt-1">Be the first to refer someone!</div></div> : <div className="space-y-2">{leaderboard.map((entry, idx) => { const rank = idx + 1; const isMe = entry.user_id === profile.id;return <div key={entry.user_id} className={`bg-white rounded-xl p-3 flex items-center gap-3 border shadow-sm ${isMe ? 'border-2 border-primary shadow-md' : 'border-border'}`}><div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-black text-sm ${rank === 1 ? 'bg-yellow-100 text-yellow-700' : rank === 2 ? 'bg-gray-100 text-gray-600' : rank === 3 ? 'bg-orange-100 text-orange-700' : 'bg-muted text-muted-foreground'}`}>{rank <= 3 ? (rank === 1 ? <Crown className="w-5 h-5" /> : <Medal className="w-5 h-5" />) : rank}</div><div className="flex-1 min-w-0"><div className="text-sm font-bold text-foreground truncate flex items-center gap-1.5">{entry.full_name || 'User'}{isMe && <span className="text-[10px] bg-primary text-white px-1.5 py-0.5 rounded-md font-bold">You</span>}</div><div className="text-xs text-muted-foreground">{entry.referral_count} referrals · {fmt(entry.total_deposit || 0)} RWF deposited</div></div></div>; })}</div>}</div>

        <div className="bg-amber-50/60 border border-amber-200/60 rounded-2xl p-4 text-amber-800 text-xs space-y-1.5"><div className="flex items-center gap-1.5 font-bold mb-1"><Info className="w-3.5 h-3.5" /><span>How it works</span></div><p>Review five bread images and rate each one every day. Your product income stays locked until all five reviews are complete and you press the claim button.</p></div>
      </div>
    </Layout>
  );
}
