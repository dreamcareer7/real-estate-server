INSERT INTO super_campaigns_email_campaigns (
  super_campaign,
  campaign
)
SELECT
  super_campaign,
  campaign
FROM
  json_populate_recordset(NULL::super_campaigns_email_campaigns, $1::json)