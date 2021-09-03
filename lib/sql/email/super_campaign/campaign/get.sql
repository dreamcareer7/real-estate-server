SELECT
  super_campaign,
  brand,
  campaign,
  extract(epoch from created_at) AS created_at,
  extract(epoch from forked_at) AS forked_at,
  extract(epoch from deleted_at) AS deleted_at,

  accepted,
  rejected,
  delivered,
  failed,
  opened,
  clicked,
  unsubscribed,
  complained,
  stored
FROM
  super_campaigns_email_campaigns
  JOIN unnest($1::text[]) WITH ORDINALITY t(eid, ord)
    ON super_campaigns_email_campaigns.id = eid
ORDER BY
  t.ord
