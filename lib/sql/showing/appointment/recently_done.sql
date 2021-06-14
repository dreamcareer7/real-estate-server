SELECT
  id
FROM
  showings_appointments
WHERE
  status = 'Confirmed'::showing_appointment_status AND
  time < now() - interval $1;
