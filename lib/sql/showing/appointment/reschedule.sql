UPDATE
  showings_appointments
SET
  "time" = $2::timestamptz,
  buyer_message = $3::text,
  updated_at = NOW()
WHERE
  id = $1::uuid
