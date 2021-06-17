SELECT
  id,
  status
FROM
  showings_appointments
WHERE
  status = ANY('{$1}'::showing_appointment_status[])
  AND time < now() - $1::interval;
