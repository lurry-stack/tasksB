/*
# Add saved mobile-money account name

1. New column
- `profiles.mobile_money_name` stores the account holder name for the signed-in user's mobile-money account.
- The value is optional at the database level so existing profiles remain valid.

2. Application behavior
- The deposit screen collects this name below the mobile-money number.
- The name is saved to the user's own profile and reused on future deposit requests.
- Deposit requests send the saved name to the existing holder-name field for admin review.

3. Security
- The existing authenticated owner-only profile update policy protects this field for normal users.
- No new table, policy, grant, or function is introduced.
*/

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS mobile_money_name text;
