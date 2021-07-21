UPDATE
  showings_appointments
SET
  feedback_email = $2::uuid,
  updated_at = NOW()
WHERE
  id = $1::uuid
