SELECT
  email_campaigns_recipients.*,
  extract(epoch FROM created_at) AS created_at,
  extract(epoch FROM updated_at) AS updated_at,
  extract(epoch FROM deleted_at) AS deleted_at,
  'email_campaign_recipient' AS type

FROM email_campaigns_recipients
JOIN unnest($1::uuid[]) WITH ORDINALITY t(eid, ord) ON email_campaigns_recipients.id = eid
ORDER BY t.ord
