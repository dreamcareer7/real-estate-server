INSERT INTO email_campaigns (
  created_by,
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
  $5
)

RETURNING id
