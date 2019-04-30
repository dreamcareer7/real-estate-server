SELECT
  *,
  'email_campaign_recipient' AS type

FROM email_campaigns_recipients
JOIN unnest($1::uuid[]) WITH ORDINALITY t(eid, ord) ON email_campaigns_recipients.id = eid
ORDER BY t.ord
