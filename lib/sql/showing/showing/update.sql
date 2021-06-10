UPDATE
  showings
SET
  updated_at = NOW(),
  updated_by = $2::uuid,
  start_date = $3::timestamptz,
  end_date = $4::timestamptz,
  aired_at = $5::timestamptz,
  duration = $6 * '1 second'::interval,
  same_day_allowed = $7::boolean,
  notice_period = $8 * '1 second'::interval,
  approval_type = $9::showing_approval_type,
  feedback_template = $10::uuid,
  address = CASE WHEN $11::json IS NULL THEN NULL ELSE JSON_TO_STDADDR($11::jsonb) END,
  allow_appraisal = $12::boolean,
  allow_inspection = $13::boolean,
  instructions = $14
WHERE
  id = $1::uuid
