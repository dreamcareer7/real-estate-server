SELECT email_campaigns.*,
  'email_campaign' AS TYPE,
  EXTRACT(EPOCH FROM created_at) AS created_at,
  EXTRACT(EPOCH FROM updated_at) AS updated_at,
  EXTRACT(EPOCH FROM deleted_at) AS deleted_at,

  (
    SELECT count(*)::int FROM emails WHERE campaign = email_campaigns.id
  ) as total

FROM email_campaigns
JOIN unnest($1::uuid[]) WITH ORDINALITY t(eid, ord) ON email_campaigns.id = eid
ORDER BY t.ord
