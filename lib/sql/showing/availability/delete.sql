DELETE FROM
  showings_availabilities
WHERE
  showing = $1::uuid
RETURNING
  id
