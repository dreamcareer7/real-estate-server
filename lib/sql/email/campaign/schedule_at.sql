UPDATE
  email_campaigns
SET
  due_at = $2
WHERE
  id = $1
