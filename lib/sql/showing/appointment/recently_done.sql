SELECT
  id
FROM
  showings_appointments
WHERE
  status = 'Confirmed' AND
  time < now() - interval $1;
