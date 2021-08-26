SELECT
  id
FROM
  triggers
WHERE
  deleted_at IS NULL AND
  contact = $1::uuid AND
  event_type = $2::text
LIMIT 1
