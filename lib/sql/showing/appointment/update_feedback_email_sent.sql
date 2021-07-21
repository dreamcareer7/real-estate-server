UPDATE
  showings_appointments
SET
  feedback_email_sent = $2::boolean,
  updated_at = NOW()
WHERE
  id = $1::uuid
