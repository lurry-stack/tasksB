/*
# Set daily income rate to 7% on every VIP product

## Plain-English summary
Every VIP product now earns 7% of its investment amount per day.
Example: NEXORA VIP 2 costs 7,000 RWF → daily income = 490 RWF (7000 × 0.07),
total return over its 30-day term = 14,700 RWF.

## 1. Modified tables
- `vip_plans`: `daily_income` recalculated as `investment_amount * 0.07` for every row;
  `total_return` recalculated as `daily_income * duration_days`.
- `user_vips`: active and historical user purchases are updated the same way so that
  ongoing daily payouts and the displayed total return reflect the new 7% rate.
  `investment_amount` and `duration_days` are NOT changed.

## 2. Data integrity
- No rows are added or deleted.
- No columns are dropped, renamed, or retyped.
- Existing days_paid values are preserved; only the per-day amount and projected total change.

## 3. Security
- No RLS policies, grants, or functions are altered.
- `pay_daily_vip_income()` and `buy_vip_plan()` continue to read `daily_income` from the
  row, so they automatically use the new 7% values with no code change required.

## 4. Important notes
1. The My Products page, VIP purchase page, and admin panel read these columns directly,
   so all displayed daily income and total return figures update automatically.
2. Frontend marketing copy that referenced the old 15% rate is updated separately to say 7%.
*/

UPDATE public.vip_plans
SET daily_income = ROUND(investment_amount * 0.07, 2),
    total_return = ROUND(investment_amount * 0.07, 2) * duration_days;

UPDATE public.user_vips
SET daily_income = ROUND(investment_amount * 0.07, 2),
    total_return = ROUND(investment_amount * 0.07, 2) * duration_days;