SELECT templates_instances.*,
  'template_instance' AS type,
  EXTRACT(EPOCH FROM created_at) AS created_at
FROM templates_instances
JOIN unnest($1::uuid[]) WITH ORDINALITY t(iid, ord) ON templates_instances.id = iid
ORDER BY t.ord
