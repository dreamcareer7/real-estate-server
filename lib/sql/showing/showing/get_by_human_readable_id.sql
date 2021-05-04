SELECT
  id
FROM
  showings
WHERE
  human_readable_id = $1
LIMIT 1