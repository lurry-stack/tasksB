-- Allow users to complete daily tasks immediately after buying a product,
-- instead of waiting until the next midnight.
-- Previously last_income_at was set to midnight of the purchase day, which
-- blocked the review function (it checks DATE(last_income_at) >= CURRENT_DATE).
-- Setting it to NULL lets the review and claim functions proceed right away.

CREATE OR REPLACE FUNCTION public.buy_vip_plan(
  p_user_id uuid, p_plan_id uuid, p_amount numeric, p_daily_income numeric,
  p_duration_days integer, p_total_return numeric, p_plan_name text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  expires_at timestamptz;
BEGIN
  expires_at := DATE_TRUNC('day', now()) + (p_duration_days || ' days')::interval;
  INSERT INTO user_vips (user_id, vip_plan_id, plan_name, investment_amount, daily_income, duration_days, total_return, purchased_at, expires_at, last_income_at, is_active)
  VALUES (p_user_id, p_plan_id, p_plan_name, p_amount, p_daily_income, p_duration_days, p_total_return, now(), expires_at, NULL, true);
  UPDATE profiles SET main_balance = main_balance - p_amount WHERE id = p_user_id;
  INSERT INTO transactions (user_id, type, amount, description)
  VALUES (p_user_id, 'vip_purchase', p_amount, 'Purchased ' || p_plan_name);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.buy_vip_plan(uuid, uuid, numeric, numeric, integer, numeric, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.buy_vip_plan(uuid, uuid, numeric, numeric, integer, numeric, text) TO authenticated;
