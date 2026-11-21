/*
# Update all VIP plan durations to 60 days

1. Changes
   - Updates every vip_plans row: sets duration_days = 60 (previously a mix of 20 and 60).
   - This affects all existing and future plans uniformly.
2. Notes
   - No data is lost; only the duration_days integer column is updated.
   - Existing user_vips rows are NOT modified — only future purchases use the new duration.
*/

UPDATE vip_plans SET duration_days = 60 WHERE duration_days != 60;
