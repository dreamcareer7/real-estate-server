INSERT INTO email_campaigns (
  due_at,
  created_by,
  "from",
  brand,
  subject,
  include_signature,
  html
)
VALUES
(
  $1,
  $2,
  $3,
  $4,
  $5,
  $6,
  $7
)

RETURNING id
