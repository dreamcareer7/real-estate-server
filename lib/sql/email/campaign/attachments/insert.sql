INSERT INTO email_campaign_attachments (
  campaign,
  file,
  is_inline,
  content_id
)
SELECT
  campaign,
  file,
  is_inline,
  content_id
FROM json_populate_recordset(NULL::email_campaign_attachments, $1::json)
RETURNING id