SELECT
  *,
  extract(epoch FROM timestamp) AS timestamp,
  extract(epoch FROM due_at) AS due_at,
  extract(epoch FROM "time") AS "time"
FROM
  triggers_due
WHERE
  id = $1::uuid
