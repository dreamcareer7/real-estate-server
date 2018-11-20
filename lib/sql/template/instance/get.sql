SELECT templates_instances.*,
  'template_instance' AS type,
  EXTRACT(EPOCH FROM created_at) AS created_at,
  EXTRACT(EPOCH FROM created_at) AS updated_at -- They are not updated at all for now but Dan needs this field.
FROM templates_instances
JOIN unnest($1::uuid[]) WITH ORDINALITY t(iid, ord) ON templates_instances.id = iid
ORDER BY t.ord
