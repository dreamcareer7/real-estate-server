SELECT
  super_campaign,
  campaign,
  extract(epoch from created_at) AS created_at,

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
