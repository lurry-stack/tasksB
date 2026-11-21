/*
# Rename NEXORA VIP products to AL ZAIN VIP

## Plain-English summary
Every VIP product whose name starts with "NEXORA VIP" is renamed to "AL ZAIN VIP" with
the same number. For example, "NEXORA VIP 1" becomes "AL ZAIN VIP 1", "NEXORA VIP 2"
becomes "AL ZAIN VIP 2", and so on through NEXORA VIP 13.

## 1. Modified tables
- `vip_plans`: `name` column updated for all rows currently starting with "NEXORA VIP".
- `user_vips`: `plan_name` column updated for all rows currently starting with "NEXORA VIP",
  so active and historical user purchases show the new name.

## 2. Data integrity
- No rows are added or deleted.
- No columns are dropped, renamed, or retyped.
- Only the name text changes; price, daily income, duration, and total return are untouched.

## 3. Security
- No RLS policies, grants, or functions are altered.

## 4. Important notes
1. The VIP purchase page, My Products page, and admin panel read these name columns
   directly, so all displayed product names update automatically.
*/

UPDATE public.vip_plans
SET name = REPLACE(name, 'NEXORA VIP', 'AL ZAIN VIP')
WHERE name LIKE 'NEXORA VIP%';

UPDATE public.user_vips
SET plan_name = REPLACE(plan_name, 'NEXORA VIP', 'AL ZAIN VIP')
WHERE plan_name LIKE 'NEXORA VIP%';