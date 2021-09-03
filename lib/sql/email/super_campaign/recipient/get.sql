SELECT
  id,
  extract(epoch FROM created_at) AS created_at,
  extract(epoch FROM updated_at) AS updated_at,
  extract(epoch FROM deleted_at) AS deleted_at,
  super_campaign,
  tag,
  brand
FROM
  super_campaigns_recipients
  JOIN unnest($1::text[]) WITH ORDINALITY t(eid, ord)
    ON super_campaigns_recipients.id = eid
ORDER BY
  t.ord
