SELECT
  id
FROM
  showinghub.appointments
WHERE
  appointment = $1::uuid
