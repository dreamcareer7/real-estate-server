INSERT INTO email_campaigns_recipients
(campaign, tag, list, contact, email)

SELECT
  campaign,
  tag,
  list,
  contact,
  email
FROM json_populate_recordset(NULL::email_campaigns_recipients, $1::json)
