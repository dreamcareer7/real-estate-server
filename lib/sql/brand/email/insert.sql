INSERT INTO brands_emails (
  created_by,
  brand,
  name,
  goal,
  subject,
  include_signature,
  body
) VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING id
