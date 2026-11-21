/*
# Update the active Al Zain VIP plan catalog

1. Purpose
- Replaces the currently displayed VIP catalog with the 13 Al Zain plans requested by the owner.
- Keeps existing plan rows intact for historical user purchases and reporting.

2. Active plan details
- All plans use a 365-day term and 7% daily income.
- Plans range from RWF 4,000 to RWF 1,000,000.
- Each plan has an explicit daily income and total income value.

3. Data safety
- Existing plan rows are not deleted or modified, so references from prior purchases remain valid.
- Existing active rows are marked inactive before the new catalog is activated.
- Re-running this migration will not create duplicate requested plans.

4. Security
- No tables, columns, grants, or row-level security policies are changed.
*/

UPDATE public.vip_plans
SET is_active = false
WHERE is_active = true;

INSERT INTO public.vip_plans (name, investment_amount, daily_income, duration_days, total_return, sort_order, is_active)
SELECT *
FROM (
  VALUES
    ('AL ZAIN VIP 1', 4000::numeric, 280::numeric, 365, 102200::numeric, 1, true),
    ('AL ZAIN VIP 2', 7000::numeric, 490::numeric, 365, 178850::numeric, 2, true),
    ('AL ZAIN VIP 3', 10000::numeric, 700::numeric, 365, 255500::numeric, 3, true),
    ('AL ZAIN VIP 4', 20000::numeric, 1400::numeric, 365, 511000::numeric, 4, true),
    ('AL ZAIN VIP 5', 35000::numeric, 2450::numeric, 365, 894250::numeric, 5, true),
    ('AL ZAIN VIP 6', 50000::numeric, 3500::numeric, 365, 1277500::numeric, 6, true),
    ('AL ZAIN VIP 7', 75000::numeric, 5250::numeric, 365, 1916250::numeric, 7, true),
    ('AL ZAIN VIP 8', 100000::numeric, 7000::numeric, 365, 2555000::numeric, 8, true),
    ('AL ZAIN VIP 9', 150000::numeric, 10500::numeric, 365, 3832500::numeric, 9, true),
    ('AL ZAIN VIP 10', 250000::numeric, 17500::numeric, 365, 6387500::numeric, 10, true),
    ('AL ZAIN VIP 11', 350000::numeric, 24500::numeric, 365, 8942500::numeric, 11, true),
    ('AL ZAIN VIP 12', 500000::numeric, 35000::numeric, 365, 12775000::numeric, 12, true),
    ('AL ZAIN VIP 13', 1000000::numeric, 70000::numeric, 365, 25550000::numeric, 13, true)
) AS requested(name, investment_amount, daily_income, duration_days, total_return, sort_order, is_active)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.vip_plans existing
  WHERE existing.name = requested.name
    AND existing.investment_amount = requested.investment_amount
    AND existing.sort_order = requested.sort_order
);

UPDATE public.vip_plans AS plans
SET
  name = requested.name,
  investment_amount = requested.investment_amount,
  daily_income = requested.daily_income,
  duration_days = requested.duration_days,
  total_return = requested.total_return,
  sort_order = requested.sort_order,
  is_active = true
FROM (
  VALUES
    ('AL ZAIN VIP 1', 4000::numeric, 280::numeric, 365, 102200::numeric, 1),
    ('AL ZAIN VIP 2', 7000::numeric, 490::numeric, 365, 178850::numeric, 2),
    ('AL ZAIN VIP 3', 10000::numeric, 700::numeric, 365, 255500::numeric, 3),
    ('AL ZAIN VIP 4', 20000::numeric, 1400::numeric, 365, 511000::numeric, 4),
    ('AL ZAIN VIP 5', 35000::numeric, 2450::numeric, 365, 894250::numeric, 5),
    ('AL ZAIN VIP 6', 50000::numeric, 3500::numeric, 365, 1277500::numeric, 6),
    ('AL ZAIN VIP 7', 75000::numeric, 5250::numeric, 365, 1916250::numeric, 7),
    ('AL ZAIN VIP 8', 100000::numeric, 7000::numeric, 365, 2555000::numeric, 8),
    ('AL ZAIN VIP 9', 150000::numeric, 10500::numeric, 365, 3832500::numeric, 9),
    ('AL ZAIN VIP 10', 250000::numeric, 17500::numeric, 365, 6387500::numeric, 10),
    ('AL ZAIN VIP 11', 350000::numeric, 24500::numeric, 365, 8942500::numeric, 11),
    ('AL ZAIN VIP 12', 500000::numeric, 35000::numeric, 365, 12775000::numeric, 12),
    ('AL ZAIN VIP 13', 1000000::numeric, 70000::numeric, 365, 25550000::numeric, 13)
) AS requested(name, investment_amount, daily_income, duration_days, total_return, sort_order)
WHERE plans.name = requested.name
  AND plans.investment_amount = requested.investment_amount
  AND plans.sort_order = requested.sort_order;
