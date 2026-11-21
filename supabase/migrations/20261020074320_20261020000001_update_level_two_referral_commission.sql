/*
# Update Level 2 referral commission

## Plain-English summary
Level 2 referrals now earn 1% commission instead of 5% when the referred user makes an approved deposit.

## 1. Modified database behavior
- `approve_deposit` now credits 1% of the deposit to the Level 2 referrer.
- `auto_deposit` now credits 1% of the deposit to the Level 2 referrer.
- Level 1 remains 20% and Level 3 remains 2%.

## 2. Data integrity
- Existing balances and previously recorded commissions are not changed.
- New deposit commissions use the updated Level 2 rate.

## 3. Security
- Existing authenticated-user and admin-controlled function behavior is preserved.
- No tables, columns, or row-level security policies are created, removed, or weakened.

## 4. Important notes
1. The My Team screen has been updated to show the new 1% Level 2 rate.
2. Historical commission records remain unchanged for auditability.
*/

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
      v_comm := v_amount * 0.01;
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
      v_comm := p_amount * 0.01;
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