SELECT
  id
FROM
  email_campaigns
WHERE
  executed_at IS NULL AND
  deleted_at IS NULL AND
  due_at <= now()
FOR UPDATE SKIP LOCKED
