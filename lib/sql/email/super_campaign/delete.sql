UPDATE
  super_campaigns
SET
  deleted_at = NOW()
WHERE
  deleted_at IS NULL AND
  id = ANY($1::uuid[])
