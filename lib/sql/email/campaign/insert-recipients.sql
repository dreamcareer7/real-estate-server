INSERT INTO email_campaigns_recipients
(campaign, tag, list, contact, email, recipient_type)

SELECT
  campaign,
  tag,
  list,
  contact,
  email,
  recipient_type
FROM json_populate_recordset(NULL::email_campaigns_recipients, $1::json)
