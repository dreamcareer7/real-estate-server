INSERT INTO email_campaigns (
  due_at,
  created_by,
  "from",
  brand,
  template,
  deal,
  subject,
  include_signature,
  individual,
  html
)
SELECT
  due_at,
  created_by,
  "from",
  brand,
  template,
  deal,
  subject,
  COALESCE(include_signature, false),
  COALESCE(individual, false),
  html
FROM json_populate_recordset(NULL::email_campaigns, $1::json)
RETURNING id
