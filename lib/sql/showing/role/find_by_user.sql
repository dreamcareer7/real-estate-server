SELECT
  id
FROM
  showings_roles
WHERE
  showing = $1::uuid
  AND "user" = $2::uuid
ORDER BY
  created_at
