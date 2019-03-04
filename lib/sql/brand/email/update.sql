UPDATE brands_emails SET
  name = $2,
  goal = $3,
  subject = $4,
  include_signature = $5,
  body = $6
WHERE id = $1
