INSERT INTO brands_emails (
  created_by,
  brand,
  name,
  goal,
  subject,
  include_signature,
  body
)
SELECT
  $1::uuid,
  $2::uuid,
  be.name,
  be.goal,
  be.subject,
  be.include_signature,
  be.body
FROM
  json_populate_recordset(NULL::brands_emails, $3) AS be
RETURNING
  id
