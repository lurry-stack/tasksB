import { Layout, PageHeader } from '../components/Layout';
import { ShieldCheck, Headphones, Award, Building2, Lock, FileText, Send, MessageCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase, Settings } from '../lib/supabase';

export function AboutPage() {
  const sections = [
    {
      icon: Building2,
      title: 'Company Introduction',
      body: 'Al Zain Bakers is a premium earning platform offering 7% daily income through carefully curated investment plans. We partner with leading global brands to provide secure, reliable, and high-yield investment opportunities for our members across Africa and beyond.',
    },
    {
      icon: Award,
      title: 'Your Right to Invest',
      body: 'It is your right to invest with Al Zain Bakers — and it is your right not to. Whether you choose to invest or not is entirely your decision, and all benefits from your investment belong to you. Al Zain Bakers does not pressure anyone to invest. We simply provide the platform; the choice and the rewards are yours alone.',
    },
    {
      icon: Award,
      title: 'Our Mission',
      body: 'To empower our members with sustainable 7% daily income through transparent, secure, and accessible investment products — starting from as little as 3,000 RWF.',
    },
    {
      icon: Lock,
      title: 'Security & Trust',
      body: 'All investments are protected by our 100% secure investment guarantee. We use bank-grade encryption and partner only with licensed financial institutions.',
    },
  ];

  return (
    <Layout>
      <PageHeader title="About Us" />
      <div className="p-4 space-y-4">
        <div className="text-center py-6 bg-white rounded-2xl border border-border shadow-sm">
          <div
            className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center mb-3 shadow-lg bg-gradient-green"
          >
            <span className="text-white text-lg font-black">AZB</span>
          </div>
          <h1 className="text-2xl font-black gradient-text font-display">AL ZAIN BAKERS</h1>
          <p className="text-sm text-muted-foreground mt-1">Premium Bakery Earning Platform</p>
        </div>

        {sections.map(({ icon: Icon, title, body }, i) => (
          <div
            key={title}
            className="bg-white rounded-2xl p-4 border border-border shadow-sm animate-fade-in-up"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Icon className="w-4 h-4 text-primary" />
              </div>
              <span className="text-sm font-bold text-foreground">{title}</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
          </div>
        ))}
      </div>
    </Layout>
  );
}

export function RegulationPage() {
  const rules = [
    'Minimum deposit: 3,000 RWF.',
    'All VIP plans earn 7% daily income of the product price for the plan duration.',
    'Referral commissions: 20% Level 1, 1% Level 2, 1% Level 3.',
    'Withdrawals are processed within 48 hours of approval.',
    'A processing fee applies to withdrawals. The current fee is shown before you submit.',
    'Withdrawals available Monday to Saturday, 07:00 to 13:00.',
  ];

  return (
    <Layout>
      <PageHeader title="Investment Rules" />
      <div className="p-4 space-y-4">
        <div className="bg-white rounded-2xl p-4 border border-border shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-primary" />
            </div>
            <span className="text-sm font-bold text-foreground">Terms of Service</span>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            By using Al Zain Bakers, you agree to our terms of service. All investment returns are based on the selected VIP plan. Al Zain Bakers is not responsible for investment losses outside the platform. Deposits are non-refundable once approved. Al Zain Bakers reserves the right to suspend accounts violating platform policies.
          </p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-border shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileText className="w-4 h-4 text-primary" />
            </div>
            <span className="text-sm font-bold text-foreground">Investment Rules</span>
          </div>
          <ul className="text-sm text-muted-foreground leading-relaxed space-y-2.5">
            {rules.map((rule, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                <span>{rule}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Layout>
  );
}

export function SupportPage() {
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    supabase.from('settings').select('*').maybeSingle().then(({ data }) => setSettings(data as Settings));
  }, []);

  const telegramChannel = settings?.telegram_channel_link || '';
  const telegramAdmin = settings?.telegram_admin_link || '';
  const whatsappGroup = settings?.whatsapp_group_link || '';

  const faqs = [
    { q: 'How do I deposit?', a: 'Go to Recharge, choose MTN or Airtel mobile money, enter your number and amount. Payment is processed automatically.' },
    { q: 'When does daily income start?', a: 'Daily income starts 24 hours after purchasing a VIP plan. Each plan earns 7% of the product price daily for the plan duration.' },
    { q: 'How long are withdrawals?', a: 'Withdrawals are processed automatically via MTN or Airtel mobile money. The applicable processing fee is shown on the withdrawal screen.' },
  ];

  return (
    <Layout>
      <PageHeader title="Customer Service" />
      <div className="p-4 space-y-4">
        <div className="bg-white rounded-2xl p-4 border border-border shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Headphones className="w-4 h-4 text-primary" />
            </div>
            <span className="text-sm font-bold text-foreground">Contact Support</span>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Our customer service team is available 24/7 to assist you with any questions or issues.
          </p>
          {telegramChannel && (
            <a href={telegramChannel} target="_blank" rel="noreferrer" className="block w-full btn-gold rounded-xl py-3 text-center text-sm font-bold flex items-center justify-center gap-2">
              <Send className="w-4 h-4" /> Join Telegram Channel
            </a>
          )}
          {telegramAdmin && (
            <a href={telegramAdmin} target="_blank" rel="noreferrer" className="block w-full rounded-xl py-3 text-center text-sm font-bold border-2 border-primary text-primary bg-primary/5 flex items-center justify-center gap-2 hover:bg-primary/10 transition-colors">
              <Send className="w-4 h-4" /> Contact Telegram Admin
            </a>
          )}
          {whatsappGroup && (
            <a href={whatsappGroup} target="_blank" rel="noreferrer" className="block w-full rounded-xl py-3 text-center text-sm font-bold border-2 border-emerald-600 text-emerald-600 bg-emerald-50 flex items-center justify-center gap-2 hover:bg-emerald-100 transition-colors">
              <MessageCircle className="w-4 h-4" /> Supportive WhatsApp Group
            </a>
          )}
        </div>

        <div className="bg-white rounded-2xl p-4 border border-border shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileText className="w-4 h-4 text-primary" />
            </div>
            <span className="text-sm font-bold text-foreground">FAQ</span>
          </div>
          <div className="space-y-3">
            {faqs.map(({ q, a }) => (
              <div key={q} className="border-b border-border last:border-0 pb-3 last:pb-0">
                <div className="text-sm font-semibold text-foreground">{q}</div>
                <div className="text-xs text-muted-foreground mt-1 leading-relaxed">{a}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}
