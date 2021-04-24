UPDATE
  showings_appointments
SET
  "time" = $2::timestamptz
  updated_at = NOW()
WHERE
  id = $1::uuid
