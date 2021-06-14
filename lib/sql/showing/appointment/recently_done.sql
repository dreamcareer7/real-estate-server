SELECT
  id,
  status
FROM
  showings_appointments
WHERE
  status IN (
    'Confirmed'::showing_appointment_status,
    'Requested'::showing_appointment_status,
    'Rescheduled'::showing_appointment_status
  ) AND
  time < now() - interval $1;
