SELECT email_campaigns.*,
  'email_campaign' AS TYPE,
  EXTRACT(EPOCH FROM created_at)    AS created_at,
  EXTRACT(EPOCH FROM updated_at)    AS updated_at,
  EXTRACT(EPOCH FROM deleted_at)    AS deleted_at,
  EXTRACT(EPOCH FROM due_at)        AS due_at,
  EXTRACT(EPOCH FROM executed_at)   AS executed_at,

  (
    SELECT count(*)::integer
    FROM email_campaign_emails
    WHERE campaign = email_campaigns.id
  ) AS sent,

  (CASE WHEN 'email_campaign.recipients' = ANY($2::text[])
    THEN (
      SELECT ARRAY_AGG(id)
      FROM email_campaigns_recipients
      WHERE campaign = email_campaigns.id
    )
    ELSE NULL
  END) AS recipients,

  (
    SELECT ARRAY_AGG(email_campaign_attachments.id)
    FROM email_campaign_attachments
    WHERE campaign = email_campaigns.id AND deleted_at IS NULL
  ) AS attachments,

  (
    SELECT ARRAY(
      SELECT id FROM email_campaign_emails
      WHERE campaign = email_campaigns.id
      AND $2 @> ARRAY['email_campaign.emails']
      AND CASE
        WHEN $3::uuid IS NULL THEN TRUE
        ELSE email_campaign_emails.contact = $3::uuid
      END
      LIMIT $4
    )
  ) as emails,

  headers,
  google_credential,
  microsoft_credential,
  recipients_count

FROM email_campaigns
JOIN unnest($1::uuid[]) WITH ORDINALITY t(eid, ord) ON email_campaigns.id = eid
ORDER BY t.ord
