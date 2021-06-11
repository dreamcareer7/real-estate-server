UPDATE
  showings_appointments
SET
  feedback = $2::jsonb
WHERE
  id = $1::uuid
