SELECT
  id,
  EXTRACT(EPOCH FROM executed_at) AS executed_at,
  EXTRACT(EPOCH FROM deleted_at) AS deleted_at
FROM
  super_campaigns
WHERE
  id = $1::uuid
FOR UPDATE SKIP LOCKED
