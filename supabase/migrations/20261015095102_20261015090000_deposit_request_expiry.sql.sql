/*
# Add two-hour deposit request expiry and one-pending-request enforcement

## Purpose
Deposit requests now have a two-hour review window. Each user may have only one
pending deposit request at a time; after two hours without approval, the request is
automatically marked rejected and the user may submit another request.

## 1. Modified tables
- `public.deposits`
  - Adds `expires_at`, the timestamp after which an unreviewed pending request is
    automatically rejected.
  - Existing pending requests receive an expiry based on their original creation
    time; approved and rejected history is unchanged.

## 2. New server functions
- `public.request_deposit(...)`
  - Accepts a deposit request for the signed-in user only.
  - Validates the amount against the configured minimum deposit.
  - Expires that user's overdue pending request before checking for duplicates.
  - Creates the request with a two-hour expiry timestamp.
- `public.expire_pending_deposits()`
  - Marks overdue pending requests as rejected with a clear admin note.
  - Runs automatically from pg_cron every five minutes.

## 3. Security changes
- Direct client INSERT, UPDATE, and DELETE privileges on `public.deposits` are
  revoked from authenticated users so request creation and review state changes
  cannot be forged through the data API.
- The request function derives the user from `auth.uid()` and is executable only
  by authenticated users.
- A partial unique index guarantees at the database level that one user cannot
  have two pending requests, including during concurrent submissions.

## 4. Important notes
1. No deposit history is deleted; expired requests remain visible as rejected.
2. The five-minute schedule means automatic rejection can occur shortly after the
   exact two-hour mark, never before it.
3. Admin approval and rejection continue through the existing server functions.
*/

ALTER TABLE public.deposits
  ADD COLUMN IF NOT EXISTS expires_at timestamptz;

UPDATE public.deposits
SET expires_at = created_at + interval '2 hours'
WHERE status = 'pending' AND expires_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS deposits_one_pending_per_user_idx
  ON public.deposits (user_id)
  WHERE status = 'pending';

CREATE OR REPLACE FUNCTION public.expire_pending_deposits()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE public.deposits
  SET status = 'rejected',
      reviewed_at = now(),
      admin_note = 'Automatically rejected after the 2-hour review window.'
  WHERE status = 'pending'
    AND expires_at IS NOT NULL
    AND expires_at <= now();

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.expire_pending_deposits() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.expire_pending_deposits() FROM anon;
REVOKE EXECUTE ON FUNCTION public.expire_pending_deposits() FROM authenticated;

CREATE OR REPLACE FUNCTION public.request_deposit(
  p_amount numeric,
  p_bank_name text,
  p_account_number text,
  p_holder_name text,
  p_screenshot_url text DEFAULT NULL
)
RETURNS public.deposits
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_min_deposit numeric;
  v_deposit public.deposits;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Invalid deposit amount';
  END IF;

  SELECT min_deposit INTO v_min_deposit
  FROM public.settings
  LIMIT 1;

  IF v_min_deposit IS NOT NULL AND p_amount < v_min_deposit THEN
    RAISE EXCEPTION 'Deposit amount is below the minimum';
  END IF;

  UPDATE public.deposits
  SET status = 'rejected',
      reviewed_at = now(),
      admin_note = 'Automatically rejected after the 2-hour review window.'
  WHERE user_id = v_user_id
    AND status = 'pending'
    AND expires_at IS NOT NULL
    AND expires_at <= now();

  IF EXISTS (
    SELECT 1
    FROM public.deposits
    WHERE user_id = v_user_id
      AND status = 'pending'
  ) THEN
    RAISE EXCEPTION 'You already have a pending deposit request';
  END IF;

  INSERT INTO public.deposits (
    user_id,
    amount,
    status,
    bank_name,
    account_number,
    holder_name,
    expires_at,
    screenshot_url
  )
  VALUES (
    v_user_id,
    p_amount,
    'pending',
    p_bank_name,
    p_account_number,
    p_holder_name,
    now() + interval '2 hours',
    p_screenshot_url
  )
  RETURNING * INTO v_deposit;

  RETURN v_deposit;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.request_deposit(numeric, text, text, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.request_deposit(numeric, text, text, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.request_deposit(numeric, text, text, text, text) TO authenticated;

REVOKE INSERT, UPDATE, DELETE ON public.deposits FROM authenticated;

DO $$
BEGIN
  PERFORM cron.unschedule('expire_pending_deposits');
EXCEPTION WHEN OTHERS THEN
  NULL;
END
$$;

SELECT cron.schedule(
  'expire_pending_deposits',
  '*/5 * * * *',
  $$SELECT public.expire_pending_deposits();$$
);
