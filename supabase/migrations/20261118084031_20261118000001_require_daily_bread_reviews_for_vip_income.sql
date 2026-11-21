/*
# Require five daily bread reviews before VIP income payout

## Plain-English summary
VIP income is no longer paid automatically at midnight. Each active product must first
complete five daily bread-image reviews. The member views five images in order, gives each
one a 1-to-5 star rating, and then presses the completion button. Only the database
function can award that product's daily income, and it awards it once per product per day.

## 1. New table
- `vip_daily_reviews`
- `id`: unique review record identifier.
- `user_vip_id`: the purchased product being reviewed.
- `user_id`: the authenticated owner of the product.
- `review_date`: the calendar day for this review.
- `image_index`: review position from 0 through 4.
- `rating`: star rating from 1 through 5.
- `created_at`: review submission time.
- A unique constraint prevents duplicate reviews for the same product, day, and image.

## 2. New functions
- `complete_daily_vip_review`: securely records one star rating after checking that the
  caller owns the active product, the product is eligible today, and the image and rating
  values are valid.
- `claim_daily_vip_income`: securely checks all five reviews, locks the product row to stop
  duplicate claims, credits the stored daily income, records the transaction, and advances
  the product by one paid day.

## 3. Modified behavior
- `pay_daily_vip_income` remains available for the existing scheduled job but no longer
  credits balances. Daily income is now released only by `claim_daily_vip_income` after all
  five reviews are complete.
- Product price, daily income, term, and total return are unchanged.

## 4. Security
- Row-level security is enabled on `vip_daily_reviews`.
- Authenticated members can read only their own review records.
- Members cannot insert, update, or delete review records directly; the validated function
  is the only write path.
- Both functions use `auth.uid()` rather than a caller-supplied user id.
- The claim locks the purchased product row and checks the current day inside the same
  database operation, preventing replay or concurrent double payment.
- Execute access is revoked from PUBLIC and anon and granted only to authenticated users.
*/

CREATE TABLE IF NOT EXISTS public.vip_daily_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_vip_id uuid NOT NULL REFERENCES public.user_vips(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  review_date date NOT NULL DEFAULT CURRENT_DATE,
  image_index integer NOT NULL CHECK (image_index >= 0 AND image_index < 5),
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT vip_daily_reviews_once_per_image UNIQUE (user_vip_id, review_date, image_index)
);

ALTER TABLE public.vip_daily_reviews ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.vip_daily_reviews TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.vip_daily_reviews FROM authenticated;

DROP POLICY IF EXISTS "select_own_vip_daily_reviews" ON public.vip_daily_reviews;
CREATE POLICY "select_own_vip_daily_reviews" ON public.vip_daily_reviews FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.complete_daily_vip_review(
  p_user_vip_id uuid,
  p_image_index integer,
  p_rating integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_vip public.user_vips%ROWTYPE;
BEGIN
  IF p_image_index IS NULL OR p_image_index < 0 OR p_image_index >= 5 THEN
    RAISE EXCEPTION 'Invalid review image';
  END IF;

  IF p_rating IS NULL OR p_rating < 1 OR p_rating > 5 THEN
    RAISE EXCEPTION 'Invalid rating';
  END IF;

  SELECT * INTO v_vip
  FROM public.user_vips
  WHERE id = p_user_vip_id
    AND user_id = auth.uid()
  FOR UPDATE;

  IF NOT FOUND OR NOT v_vip.is_active OR v_vip.days_paid >= v_vip.duration_days THEN
    RAISE EXCEPTION 'Product is not available for review';
  END IF;

  IF v_vip.last_income_at IS NOT NULL AND DATE(v_vip.last_income_at) >= CURRENT_DATE THEN
    RAISE EXCEPTION 'This product has already been completed today';
  END IF;

  INSERT INTO public.vip_daily_reviews (user_vip_id, user_id, review_date, image_index, rating)
  VALUES (v_vip.id, auth.uid(), CURRENT_DATE, p_image_index, p_rating)
  ON CONFLICT (user_vip_id, review_date, image_index) DO UPDATE SET rating = EXCLUDED.rating;
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_daily_vip_income(p_user_vip_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_vip public.user_vips%ROWTYPE;
  v_review_count integer;
  v_income numeric;
BEGIN
  SELECT * INTO v_vip
  FROM public.user_vips
  WHERE id = p_user_vip_id
    AND user_id = auth.uid()
  FOR UPDATE;

  IF NOT FOUND OR NOT v_vip.is_active OR v_vip.days_paid >= v_vip.duration_days THEN
    RAISE EXCEPTION 'Product is not available for income';
  END IF;

  IF v_vip.last_income_at IS NOT NULL AND DATE(v_vip.last_income_at) >= CURRENT_DATE THEN
    RAISE EXCEPTION 'Daily income has already been claimed';
  END IF;

  SELECT COUNT(*) INTO v_review_count
  FROM public.vip_daily_reviews
  WHERE user_vip_id = v_vip.id
    AND user_id = auth.uid()
    AND review_date = CURRENT_DATE;

  IF v_review_count < 5 THEN
    RAISE EXCEPTION 'Complete all five reviews first';
  END IF;

  v_income := v_vip.daily_income;

  UPDATE public.user_vips
  SET days_paid = days_paid + 1,
      last_income_at = now(),
      is_active = (days_paid + 1 < duration_days)
  WHERE id = v_vip.id;

  UPDATE public.profiles
  SET main_balance = main_balance + v_income,
      total_earnings = total_earnings + v_income
  WHERE id = auth.uid();

  INSERT INTO public.transactions (user_id, type, amount, description)
  VALUES (auth.uid(), 'vip_income', v_income, 'Daily VIP income after five bread reviews');

  RETURN v_income;
END;
$$;

CREATE OR REPLACE FUNCTION public.pay_daily_vip_income()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NULL;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.complete_daily_vip_review(uuid, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_daily_vip_review(uuid, integer, integer) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.claim_daily_vip_income(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_daily_vip_income(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.pay_daily_vip_income() FROM PUBLIC, anon, authenticated;
