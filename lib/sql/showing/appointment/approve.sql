UPDATE
  showings_appointments
SET
  status = 'Accepted'::showing_appointment_status,
  updated_at = NOW()
WHERE
  id = $1::uuid
