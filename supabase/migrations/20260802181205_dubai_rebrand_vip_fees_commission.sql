/*
# Dubai rebrand: VIP tiers, daily income 15%, withdraw fee 20%, referral 20%

## Changes

### 1. VIP Plans — replaced with new tiers
- VIP 1: 3,000 RWF (entry tier)
- VIP 2: 5,000 RWF
- VIP 3: 10,000 RWF (VIP 2 doubled, doubling continues)
- VIP 4: 20,000 RWF
- VIP 5: 40,000 RWF
- VIP 6: 80,000 RWF
- VIP 7: 160,000 RWF
- VIP 8: 320,000 RWF
- VIP 9: 640,000 RWF
- VIP 10: 1,280,000 RWF (final tier)
- Daily income = 15% of investment (0.15 rate).
- Duration: 20 days. Total return = daily_income * 20.
- Old plans deactivated (not deleted) to preserve purchase history.

### 2. Withdrawal fee: 20%
- request_withdrawal and auto_withdraw RPCs updated to 0.20 fee.

### 3. Referral commission: 20% Level 1
- approve_deposit and auto_deposit RPCs updated: Level 1 = 20%.
- (Level 2/3 unchanged.)

### 4. Settings
- min_deposit lowered to 3000.
- min_withdraw set to 3000.
- announcement / welcome_message updated to Dubai brand.

### 5. Notes
- All RPCs SECURITY DEFINER. Idempotent.
*/

-- ============================================================
-- 1. Deactivate old VIP plans and insert new tiers
-- ============================================================
UPDATE public.vip_plans SET is_active = false WHERE is_active = true;

INSERT INTO public.vip_plans (name, investment_amount, daily_income, duration_days, total_return, sort_order, is_active)
VALUES
  ('VIP 1',      3000,     450,    20, 9000,       1,  true),
  ('VIP 2',      5000,     750,    20, 15000,      2,  true),
  ('VIP 3',      10000,    1500,   20, 30000,      3,  true),
  ('VIP 4',      20000,    3000,   20, 60000,      4,  true),
  ('VIP 5',      40000,    6000,   20, 120000,     5,  true),
  ('VIP 6',      80000,    12000,  20, 240000,     6,  true),
  ('VIP 7',      160000,   24000,  20, 480000,     7,  true),
  ('VIP 8',      320000,   48000,  20, 960000,     8,  true),
  ('VIP 9',      640000,   96000,  20, 1920000,    9,  true),
  ('VIP 10',     1280000,  192000, 20, 3840000,   10, true)
ON CONFLICT DO NOTHING;

-- ============================================================
-- 2. Settings: min deposit 3000, min withdraw 3000, Dubai text
-- ============================================================
UPDATE public.settings SET
  min_deposit = 3000,
  min_withdraw = 3000,
  announcement = 'Welcome to Dubai VIP Investment Platform! Earn 15% daily income with our premium VIP plans.',
  welcome_message = 'Welcome to Dubai! Start your investment journey today and earn 15% daily income with our premium VIP plans.'
WHERE id = (SELECT id FROM public.settings LIMIT 1);

-- ============================================================
-- 3. approve_deposit: Level 1 referral commission 20%
-- ============================================================
CREATE OR REPLACE FUNCTION public.approve_deposit(p_deposit_id uuid)
RETURNS public.deposits
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deposit public.deposits;
  v_user_id uuid;
  v_amount numeric;
  v_level1 uuid;
  v_level2 uuid;
  v_level3 uuid;
  v_comm numeric;
BEGIN
  SELECT * INTO v_deposit FROM public.deposits WHERE id = p_deposit_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Deposit not found'; END IF;
  IF v_deposit.status <> 'pending' THEN RAISE EXCEPTION 'Deposit already processed'; END IF;
  v_user_id := v_deposit.user_id;
  v_amount := v_deposit.amount;

  UPDATE public.profiles SET main_balance = main_balance + v_amount, total_deposit = total_deposit + v_amount WHERE id = v_user_id;
  UPDATE public.deposits SET status = 'approved', reviewed_at = now() WHERE id = p_deposit_id RETURNING * INTO v_deposit;
  INSERT INTO public.transactions (user_id, type, amount, description) VALUES (v_user_id, 'deposit', v_amount, 'Deposit approved');

  SELECT referred_by INTO v_level1 FROM public.profiles WHERE id = v_user_id;
  IF v_level1 IS NOT NULL THEN
    v_comm := v_amount * 0.20;
    UPDATE public.profiles SET total_referral_commission = total_referral_commission + v_comm, main_balance = main_balance + v_comm WHERE id = v_level1;
    INSERT INTO public.referral_commissions (earner_id, source_user_id, deposit_id, level, commission_amount, paid) VALUES (v_level1, v_user_id, p_deposit_id, 1, v_comm, true);

    SELECT referred_by INTO v_level2 FROM public.profiles WHERE id = v_level1;
    IF v_level2 IS NOT NULL THEN
      v_comm := v_amount * 0.05;
      UPDATE public.profiles SET total_referral_commission = total_referral_commission + v_comm, main_balance = main_balance + v_comm WHERE id = v_level2;
      INSERT INTO public.referral_commissions (earner_id, source_user_id, deposit_id, level, commission_amount, paid) VALUES (v_level2, v_user_id, p_deposit_id, 2, v_comm, true);

      SELECT referred_by INTO v_level3 FROM public.profiles WHERE id = v_level2;
      IF v_level3 IS NOT NULL THEN
        v_comm := v_amount * 0.02;
        UPDATE public.profiles SET total_referral_commission = total_referral_commission + v_comm, main_balance = main_balance + v_comm WHERE id = v_level3;
        INSERT INTO public.referral_commissions (earner_id, source_user_id, deposit_id, level, commission_amount, paid) VALUES (v_level3, v_user_id, p_deposit_id, 3, v_comm, true);
      END IF;
    END IF;
  END IF;
  RETURN v_deposit;
END;
$$;

-- ============================================================
-- 4. auto_deposit: Level 1 referral commission 20%
-- ============================================================
CREATE OR REPLACE FUNCTION public.auto_deposit(p_amount numeric, p_provider text, p_phone text, p_screenshot_url text DEFAULT NULL)
RETURNS public.deposits
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_deposit public.deposits;
  v_level1 uuid;
  v_level2 uuid;
  v_level3 uuid;
  v_comm numeric;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_amount <= 0 THEN RAISE EXCEPTION 'Invalid amount'; END IF;
  IF p_provider NOT IN ('MTN', 'Airtel') THEN RAISE EXCEPTION 'Provider must be MTN or Airtel'; END IF;

  INSERT INTO public.deposits (user_id, amount, status, bank_name, account_number, holder_name, reviewed_at, screenshot_url)
    VALUES (v_user_id, p_amount, 'approved', p_provider, p_phone, p_provider || ' - ' || p_phone, now(), p_screenshot_url)
    RETURNING * INTO v_deposit;

  UPDATE public.profiles SET main_balance = main_balance + p_amount, total_deposit = total_deposit + p_amount WHERE id = v_user_id;
  INSERT INTO public.transactions (user_id, type, amount, description) VALUES (v_user_id, 'deposit', p_amount, 'Mobile money deposit (' || p_provider || ')');

  SELECT referred_by INTO v_level1 FROM public.profiles WHERE id = v_user_id;
  IF v_level1 IS NOT NULL THEN
    v_comm := p_amount * 0.20;
    UPDATE public.profiles SET total_referral_commission = total_referral_commission + v_comm, main_balance = main_balance + v_comm WHERE id = v_level1;
    INSERT INTO public.referral_commissions (earner_id, source_user_id, deposit_id, level, commission_amount, paid) VALUES (v_level1, v_user_id, v_deposit.id, 1, v_comm, true);

    SELECT referred_by INTO v_level2 FROM public.profiles WHERE id = v_level1;
    IF v_level2 IS NOT NULL THEN
      v_comm := p_amount * 0.05;
      UPDATE public.profiles SET total_referral_commission = total_referral_commission + v_comm, main_balance = main_balance + v_comm WHERE id = v_level2;
      INSERT INTO public.referral_commissions (earner_id, source_user_id, deposit_id, level, commission_amount, paid) VALUES (v_level2, v_user_id, v_deposit.id, 2, v_comm, true);

      SELECT referred_by INTO v_level3 FROM public.profiles WHERE id = v_level2;
      IF v_level3 IS NOT NULL THEN
        v_comm := p_amount * 0.02;
        UPDATE public.profiles SET total_referral_commission = total_referral_commission + v_comm, main_balance = main_balance + v_comm WHERE id = v_level3;
        INSERT INTO public.referral_commissions (earner_id, source_user_id, deposit_id, level, commission_amount, paid) VALUES (v_level3, v_user_id, v_deposit.id, 3, v_comm, true);
      END IF;
    END IF;
  END IF;
  RETURN v_deposit;
END;
$$;

-- ============================================================
-- 5. request_withdrawal: 20% fee
-- ============================================================
CREATE OR REPLACE FUNCTION public.request_withdrawal(
  p_amount numeric, p_provider text, p_phone text, p_holder_name text DEFAULT ''
)
RETURNS public.withdrawals
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_w public.withdrawals;
  v_balance numeric;
  v_fee numeric;
  v_min numeric;
  v_has_vip boolean;
  v_hour int;
  v_dow int;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_amount <= 0 THEN RAISE EXCEPTION 'Invalid amount'; END IF;
  IF p_provider NOT IN ('MTN', 'Airtel') THEN RAISE EXCEPTION 'Provider must be MTN or Airtel'; END IF;

  v_hour := EXTRACT(HOUR FROM now());
  v_dow := EXTRACT(DOW FROM now());
  IF v_dow = 0 THEN
    RAISE EXCEPTION 'Withdrawals are not available on Sundays. Available Mon-Sat 07:00-13:00';
  END IF;
  IF v_hour < 7 OR v_hour >= 13 THEN
    RAISE EXCEPTION 'Withdrawals are only available from 07:00 to 13:00, Monday to Saturday';
  END IF;

  SELECT min_withdraw INTO v_min FROM public.settings LIMIT 1;
  IF v_min IS NULL THEN v_min := 3000; END IF;
  IF p_amount < v_min THEN RAISE EXCEPTION 'Minimum withdrawal is % RWF', v_min; END IF;

  SELECT EXISTS(SELECT 1 FROM public.user_vips WHERE user_id = v_user_id) INTO v_has_vip;
  IF NOT v_has_vip THEN RAISE EXCEPTION 'You must purchase at least one product before withdrawing'; END IF;

  SELECT main_balance INTO v_balance FROM public.profiles WHERE id = v_user_id;
  IF v_balance IS NULL THEN RAISE EXCEPTION 'User not found'; END IF;
  IF v_balance < p_amount THEN RAISE EXCEPTION 'Insufficient balance'; END IF;

  v_fee := p_amount * 0.20;  -- 20% fee
  UPDATE public.profiles SET main_balance = main_balance - p_amount WHERE id = v_user_id;
  INSERT INTO public.withdrawals (user_id, amount, status, bank_name, account_number, holder_name, fee)
    VALUES (v_user_id, p_amount, 'pending', p_provider, p_phone, p_holder_name, v_fee) RETURNING * INTO v_w;
  INSERT INTO public.transactions (user_id, type, amount, description)
    VALUES (v_user_id, 'withdrawal', p_amount, 'Withdrawal requested (' || p_provider || ') - Fee: ' || v_fee);
  RETURN v_w;
END;
$$;

-- ============================================================
-- 6. auto_withdraw: 20% fee
-- ============================================================
CREATE OR REPLACE FUNCTION public.auto_withdraw(p_amount numeric, p_provider text, p_phone text)
RETURNS public.withdrawals
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_w public.withdrawals;
  v_balance numeric;
  v_fee numeric;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_amount <= 0 THEN RAISE EXCEPTION 'Invalid amount'; END IF;
  IF p_provider NOT IN ('MTN', 'Airtel') THEN RAISE EXCEPTION 'Provider must be MTN or Airtel'; END IF;

  SELECT main_balance INTO v_balance FROM public.profiles WHERE id = v_user_id;
  IF v_balance IS NULL THEN RAISE EXCEPTION 'User not found'; END IF;
  IF v_balance < p_amount THEN RAISE EXCEPTION 'Insufficient balance'; END IF;

  v_fee := p_amount * 0.20;
  UPDATE public.profiles SET main_balance = main_balance - p_amount WHERE id = v_user_id;
  INSERT INTO public.withdrawals (user_id, amount, status, bank_name, account_number, holder_name, reviewed_at, fee)
    VALUES (v_user_id, p_amount, 'approved', p_provider, p_phone, p_provider || ' - ' || p_phone, now(), v_fee) RETURNING * INTO v_w;
  INSERT INTO public.transactions (user_id, type, amount, description)
    VALUES (v_user_id, 'withdrawal', p_amount, 'Mobile money withdrawal (' || p_provider || ') - Fee: ' || v_fee);
  RETURN v_w;
END;
$$;