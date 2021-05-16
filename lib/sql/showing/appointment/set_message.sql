UPDATE
  showings_appointments
SET
  buyer_message = $2
WHERE
  id = $1::uuid