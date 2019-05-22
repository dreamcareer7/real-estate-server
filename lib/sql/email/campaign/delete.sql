UPDATE
  email_campaigns
SET
  deleted_at = NOW()
WHERE
  id = ANY($1::uuid[])
