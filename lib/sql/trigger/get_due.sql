SELECT
  *,
  extract(epoch FROM timestamp) AS timestamp,
  extract(epoch FROM due_at) AS due_at,
  extract(epoch FROM wait_for) AS wait_for
FROM
  triggers_due
WHERE
  id = $1::uuid
