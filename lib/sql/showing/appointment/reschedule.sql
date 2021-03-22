UPDATE
  showings_appointments
SET
  "time" = $2::timestamptz,
  status = $3::showing_appointment_status,
  updated_at = NOW()
WHERE
  id = $1::uuid
