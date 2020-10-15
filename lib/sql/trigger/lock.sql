SELECT
  id,
  executed_at
FROM
  triggers
WHERE
  id = $1::uuid
FOR UPDATE SKIP LOCKED
