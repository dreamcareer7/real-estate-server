UPDATE
  super_campaigns
SET
  executed_at = now()
WHERE
  id = $1::uuid AND
  deleted_at IS NULL AND
  executed_at IS NULL
