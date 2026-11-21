/*
# Allow newly purchased VIP plans to be reviewed immediately

1. Problem fixed
- Newly purchased products need `last_income_at = NULL` so the user can complete today's five reviews immediately.
- The previous column constraint rejected that value and caused purchases to fail.

2. Data change
- `user_vips.last_income_at` is changed from NOT NULL to nullable.
- Existing timestamps are preserved unchanged.
- No rows are deleted, recreated, or reset.

3. Application behavior
- A NULL value means the product has not claimed income today.
- The existing review and income-claim functions already support this behavior.
- After a successful daily claim, the column is set to the current timestamp as before.

4. Security
- No permissions, policies, or function access rules are changed.
*/

ALTER TABLE public.user_vips
ALTER COLUMN last_income_at DROP NOT NULL;
