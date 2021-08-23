SELECT
  id,
  status
FROM
  showings_appointments
WHERE
  status = ANY('{Confirmed,Requested,Rescheduled}'::showing_appointment_status[])
  AND time < now() - $1::interval;
