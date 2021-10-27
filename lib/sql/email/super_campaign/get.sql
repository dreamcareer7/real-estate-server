SELECT
  id,
  extract(epoch FROM created_at) AS created_at,
  extract(epoch FROM updated_at) AS updated_at,
  extract(epoch FROM deleted_at) AS deleted_at,
  extract(epoch FROM due_at) AS due_at,
  extract(epoch FROM executed_at) AS executed_at,
  created_by,
  brand,
  subject,
  description,
  tags,
  template_instance,
  (
    SELECT array_agg(brand) FROM super_campaigns_eligibility WHERE super_campaign = super_campaigns.id
  ) as eligible_brands,
  'super_campaign' AS type
FROM
  super_campaigns
  JOIN unnest($1::uuid[]) WITH ORDINALITY t(eid, ord)
    ON super_campaigns.id = eid
ORDER BY
  t.ord
