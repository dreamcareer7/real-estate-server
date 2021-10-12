UPDATE
  super_campaigns
SET
  tags = $2::text[]
WHERE
  id = $1::uuid
