SELECT
  *,
  extract(epoch FROM timestamp) AS timestamp,
  extract(epoch FROM due_at) AS due_at
FROM
  triggers_due
WHERE
  id = $1::uuid
