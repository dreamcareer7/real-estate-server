SELECT
  bt.id,
  bt.brand,
  bt.template,
  bt.template_instance,
  bt.event_type,
  bt.wait_for,
  bt.subject,
  bt.created_at,
  bt.updated_at,
  bt.deleted_at,
  'brand_trigger' as type,
FROM
  brand_triggers AS bt
  JOIN unnest($1::uuid[]) WITH ORDINALITY t(id, ord)
    ON t.id = bt.id
ORDER BY
  t.ord
