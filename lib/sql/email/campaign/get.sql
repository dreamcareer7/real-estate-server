SELECT email_campaigns.*,
  'email_campaign' AS TYPE,
  EXTRACT(EPOCH FROM created_at) AS created_at,
  EXTRACT(EPOCH FROM updated_at) AS updated_at,
  EXTRACT(EPOCH FROM deleted_at) AS deleted_at,

  (
    SELECT count(*)::int
    FROM emails
    WHERE campaign = email_campaigns.id
  ) AS recipients,

  (
    SELECT ARRAY_AGG(files_relations.file)
    FROM files_relations
    WHERE role = 'EmailCampaign' AND role_id = email_campaigns.id
  ) AS attachments,

  (
    SELECT ARRAY_AGG(id) FROM email_campaign_emails
    WHERE campaign = email_campaigns.id
    AND $2 @> ARRAY['email_campaign.emails']
  ) as emails

FROM email_campaigns
JOIN unnest($1::uuid[]) WITH ORDINALITY t(eid, ord) ON email_campaigns.id = eid
ORDER BY t.ord
