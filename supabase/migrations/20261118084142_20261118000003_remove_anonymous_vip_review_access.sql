/*
# Remove anonymous access from VIP review records

## Plain-English summary
VIP review records belong only to signed-in members. This migration removes the default
anonymous Data API privileges from the review table and purchased-product table. The
signed-in product flow continues to work through its owner checks and secure functions.

## 1. Security changes
- `vip_daily_reviews`: anon has no SELECT, INSERT, UPDATE, or DELETE access.
- `user_vips`: anon has no SELECT, INSERT, UPDATE, or DELETE access.
- Authenticated members retain only the privileges needed by the product flow: reading
  their own products and reading their own reviews; purchase, review submission, and
  income claiming use protected functions.

## 2. Data integrity
- No rows or columns are changed.
- No existing member access is removed from the intended signed-in flow.
*/

REVOKE SELECT, INSERT, UPDATE, DELETE ON public.vip_daily_reviews FROM anon;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.user_vips FROM anon;