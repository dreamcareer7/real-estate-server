SELECT
  bt.id,
  bt.brand,
  bt.template,
  bt.template_instance,
  bt.event_type,
  extract(epoch FROM bt.wait_for) AS wait_for,
  bt.subject,
  extract(epoch FROM bt.created_at) AS created_at,
  extract(epoch FROM bt.updated_at) AS updated_at,
  extract(epoch FROM bt.deleted_at) AS deleted_at,
  'brand_trigger' as type
FROM
  brand_triggers AS bt
  JOIN unnest($1::uuid[]) WITH ORDINALITY t(id, ord)
    ON t.id = bt.id
ORDER BY
  t.ord
