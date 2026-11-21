/*
# Configure withdrawal minimum and fee

1. Purpose
- Make the minimum withdrawal and withdrawal fee editable from the admin settings screen.
- Set the current live defaults to 1,000 RWF minimum withdrawal and a 10% processing fee.
- Ensure withdrawal requests use the saved settings instead of a hard-coded percentage.

2. Modified Table
- `public.settings`
- Add `withdraw_fee_percent` (numeric, non-negative percentage used for new withdrawal requests).
- Set the existing singleton settings row to `min_withdraw = 1000` and `withdraw_fee_percent = 10`.

3. Modified Functions
- Replace both supported `public.request_withdrawal` overloads so they read `min_withdraw` and `withdraw_fee_percent` from `public.settings`.
- Keep authentication, VIP eligibility, balance checks, withdrawal hours, and existing records unchanged.

4. Security
- Preserve SECURITY DEFINER behavior for the withdrawal RPCs.
- Keep the existing authenticated execution grants and function signatures.
- No user data is deleted or altered.

5. Important Notes
- The fee is stored on each withdrawal record at request time, so changing the setting only affects future withdrawal requests.
- Existing withdrawal records keep their original fee values for accurate history.
*/

ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS withdraw_fee_percent numeric NOT NULL DEFAULT 10;

UPDATE public.settings
SET min_withdraw = 1000,
    withdraw_fee_percent = 10;

CREATE OR REPLACE FUNCTION public.request_withdrawal(
  p_amount numeric,
  p_provider text,
  p_phone text,
  p_holder_name text DEFAULT ''
)
RETURNS public.withdrawals
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_w public.withdrawals;
  v_balance numeric;
  v_fee numeric;
  v_min numeric;
  v_fee_percent numeric;
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

  SELECT min_withdraw, withdraw_fee_percent
  INTO v_min, v_fee_percent
  FROM public.settings
  LIMIT 1;
  v_min := COALESCE(v_min, 1000);
  v_fee_percent := COALESCE(v_fee_percent, 10);
  IF p_amount < v_min THEN RAISE EXCEPTION 'Minimum withdrawal is % RWF', v_min; END IF;
  IF v_fee_percent < 0 THEN RAISE EXCEPTION 'Withdrawal fee is not configured correctly'; END IF;

  SELECT EXISTS(SELECT 1 FROM public.user_vips WHERE user_id = v_user_id) INTO v_has_vip;
  IF NOT v_has_vip THEN RAISE EXCEPTION 'You must purchase at least one product before withdrawing'; END IF;

  SELECT main_balance INTO v_balance FROM public.profiles WHERE id = v_user_id;
  IF v_balance IS NULL THEN RAISE EXCEPTION 'User not found'; END IF;
  IF v_balance < p_amount THEN RAISE EXCEPTION 'Insufficient balance'; END IF;

  v_fee := p_amount * (v_fee_percent / 100);
  UPDATE public.profiles SET main_balance = main_balance - p_amount WHERE id = v_user_id;
  INSERT INTO public.withdrawals (user_id, amount, status, bank_name, account_number, holder_name, fee)
  VALUES (v_user_id, p_amount, 'pending', p_provider, p_phone, p_holder_name, v_fee)
  RETURNING * INTO v_w;
  INSERT INTO public.transactions (user_id, type, amount, description)
  VALUES (v_user_id, 'withdrawal', p_amount, 'Withdrawal requested (' || p_provider || ') - Fee: ' || v_fee);
  RETURN v_w;
END;
$function$;

CREATE OR REPLACE FUNCTION public.request_withdrawal(
  p_amount numeric,
  p_provider text,
  p_phone text
)
RETURNS public.withdrawals
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_w public.withdrawals;
  v_balance numeric;
  v_fee numeric;
  v_min numeric;
  v_fee_percent numeric;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_amount <= 0 THEN RAISE EXCEPTION 'Invalid amount'; END IF;
  IF p_provider NOT IN ('MTN', 'Airtel') THEN RAISE EXCEPTION 'Provider must be MTN or Airtel'; END IF;

  SELECT min_withdraw, withdraw_fee_percent
  INTO v_min, v_fee_percent
  FROM public.settings
  LIMIT 1;
  v_min := COALESCE(v_min, 1000);
  v_fee_percent := COALESCE(v_fee_percent, 10);
  IF p_amount < v_min THEN RAISE EXCEPTION 'Minimum withdrawal is % RWF', v_min; END IF;

  SELECT main_balance INTO v_balance FROM public.profiles WHERE id = v_user_id;
  IF v_balance IS NULL THEN RAISE EXCEPTION 'User not found'; END IF;
  IF v_balance < p_amount THEN RAISE EXCEPTION 'Insufficient balance'; END IF;

  v_fee := p_amount * (v_fee_percent / 100);
  UPDATE public.profiles SET main_balance = main_balance - p_amount WHERE id = v_user_id;
  INSERT INTO public.withdrawals (user_id, amount, status, bank_name, account_number, holder_name, fee)
  VALUES (v_user_id, p_amount, 'pending', p_provider, p_phone, p_provider || ' - ' || p_phone, v_fee)
  RETURNING * INTO v_w;
  INSERT INTO public.transactions (user_id, type, amount, description)
  VALUES (v_user_id, 'withdrawal', p_amount, 'Withdrawal requested (' || p_provider || ') - Fee: ' || v_fee);
  RETURN v_w;
END;
$function$;
