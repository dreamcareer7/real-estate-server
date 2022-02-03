SELECT
  id
FROM
  super_campaigns
WHERE
  executed_at IS NULL AND
  deleted_at IS NULL AND
  due_at <= now() AND
  template_instance IS NOT NULL
FOR UPDATE SKIP LOCKED
