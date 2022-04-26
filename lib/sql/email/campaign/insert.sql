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
  html,
  text,
  headers,
  google_credential,
  microsoft_credential,
  notifications_enabled,
  archive,
  tags
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
  html,
  text,
  headers,
  google_credential,
  microsoft_credential,
  COALESCE(notifications_enabled, true),
  COALESCE(archive, false),
  tags
FROM json_populate_recordset(NULL::email_campaigns, $1::json)
RETURNING id
