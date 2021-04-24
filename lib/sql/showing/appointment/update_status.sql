UPDATE
  showings_appointments
SET
  status = $2::showing_appointment_status,
  updated_at = NOW()
WHERE
  id = $1::uuid
