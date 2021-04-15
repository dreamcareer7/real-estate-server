UPDATE
  showings
SET
  updated_at = NOW(),
  updated_by = $1::uuid,
  start_date = $2::timestamptz,
  end_date = $3::timestamptz,
  duration = $4 * '1 second'::interval,
  same_day_allowed = $5::boolean,
  notice_period = $6 * '1 second'::interval,
  feedback_template = $7::uuid,
  address = JSON_TO_STDADDR($8::json),
  allow_appraisal = $9::boolean,
  allow_inspection = $10::boolean,
  instructions = $11
WHERE
  id = $1::uuid
