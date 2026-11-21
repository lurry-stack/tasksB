/*
# Set VIP product term to 365 days and recompute total return

## Plain-English summary
Every AL ZAIN VIP product now runs for 365 days instead of 30 days. The total return
is recalculated as daily_income * 365. For example, AL ZAIN VIP 2 costs 7,000 RWF with
a daily income of 490 RWF, so its total return over 365 days is 178,850 RWF.

## 1. Modified tables
- `vip_plans`: `duration_days` set to 365 for every row; `total_return` recalculated as
  `daily_income * 365`.
- `user_vips`: `duration_days` set to 365 and `total_return` recalculated as
  `daily_income * 365` for all rows, so active and historical purchases reflect the
  new term and projected total. `days_paid` is preserved and `is_active` is set to true
  where `days_paid < 365` so ongoing plans continue paying out to the new term.

## 2. Data integrity
- No rows are added or deleted.
- No columns are dropped, renamed, or retyped.
- `daily_income` and `investment_amount` are not changed.

## 3. Security
- No RLS policies, grants, or functions are altered.
- `pay_daily_vip_income()` and `buy_vip_plan()` read duration_days and total_return from
  the row, so they automatically use the new 365-day values.

## 4. Important notes
1. The VIP purchase page already shows "Total income" on each product card, so the new
   365-day total will display automatically.
*/

UPDATE public.vip_plans
SET duration_days = 365,
    total_return = ROUND(daily_income * 365, 2);

UPDATE public.user_vips
SET duration_days = 365,
    total_return = ROUND(daily_income * 365, 2),
    is_active = (days_paid < 365);