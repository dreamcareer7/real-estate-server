SELECT
  id,
  extract(epoch FROM created_at) AS created_at,
  extract(epoch FROM updated_at) AS updated_at,
  extract(epoch FROM deleted_at) AS deleted_at,
  extract(epoch FROM executed_at) AS executed_at,
  created_by,
  brand,
  subject,
  template_instance,
  (
    SELECT array_agg(id) FROM super_campaigns_recipients WHERE super_campaign = super_campaigns.id
  ) as recipients
FROM
  super_campaigns
  JOIN unnest($1::text[]) WITH ORDINALITY t(eid, ord)
    ON super_campaigns.id = eid
ORDER BY
  t.ord
