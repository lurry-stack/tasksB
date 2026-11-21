/*
# Secure VIP purchase values

## Plain-English summary
New product purchases now use the price, daily income, term, and total return stored in
`vip_plans`. Values sent by the browser are ignored for these financial fields, so a user
cannot change the product price or daily payout by editing a request.

## 1. Modified function
- `buy_vip_plan`: verifies the signed-in caller owns the purchase request, locks the selected
  active product, checks the caller's balance, and copies all financial values from
  `vip_plans` before creating the purchased product.

## 2. Security
- Direct authenticated inserts, updates, and deletes on `user_vips` are revoked. Purchases
  go through the validated function, and daily payouts go through the validated review claim.
- Function execution is limited to authenticated users.

## 3. Data integrity
- Existing products and user balances are not changed by this migration.
- The existing function signature remains compatible with the current product page, while
  its client-supplied financial arguments are no longer trusted.
*/

REVOKE INSERT, UPDATE, DELETE ON public.user_vips FROM authenticated;

CREATE OR REPLACE FUNCTION public.buy_vip_plan(
  p_user_id uuid,
  p_plan_id uuid,
  p_amount numeric,
  p_daily_income numeric,
  p_duration_days integer,
  p_total_return numeric,
  p_plan_name text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan public.vip_plans%ROWTYPE;
  v_balance numeric;
  v_purchase_midnight timestamptz;
  v_expires_at timestamptz;
BEGIN
  IF p_user_id IS NULL OR p_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT * INTO v_plan
  FROM public.vip_plans
  WHERE id = p_plan_id AND is_active = true
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product is not available';
  END IF;

  SELECT main_balance INTO v_balance
  FROM public.profiles
  WHERE id = auth.uid()
  FOR UPDATE;

  IF v_balance IS NULL OR v_balance < v_plan.investment_amount THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;

  v_purchase_midnight := date_trunc('day', now());
  v_expires_at := v_purchase_midnight + (v_plan.duration_days || ' days')::interval;

  INSERT INTO public.user_vips (
    user_id, vip_plan_id, plan_name, investment_amount, daily_income,
    duration_days, total_return, purchased_at, expires_at, last_income_at, is_active
  ) VALUES (
    auth.uid(), v_plan.id, v_plan.name, v_plan.investment_amount, v_plan.daily_income,
    v_plan.duration_days, v_plan.total_return, now(), v_expires_at, v_purchase_midnight, true
  );

  UPDATE public.profiles
  SET main_balance = main_balance - v_plan.investment_amount
  WHERE id = auth.uid();

  INSERT INTO public.transactions (user_id, type, amount, description)
  VALUES (auth.uid(), 'vip_purchase', v_plan.investment_amount, 'Purchased ' || v_plan.name);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.buy_vip_plan(uuid, uuid, numeric, numeric, integer, numeric, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.buy_vip_plan(uuid, uuid, numeric, numeric, integer, numeric, text) TO authenticated;