UPDATE
  super_campaigns
SET
  deleted_at = NOW()
WHERE
  id = $1::uuid
