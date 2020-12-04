SELECT
  templates_instances.id,
  COUNT(*) OVER()::INT as total
FROM templates_instances
JOIN templates ON templates.id = templates_instances.template
WHERE templates_instances.created_by = $1
AND templates_instances.deleted_at IS NULL
AND $2::template_type[] IS NULL OR templates.template_type = ANY($2)
AND $3::template_medium[] IS NULL OR templates.medium = ANY($3)
ORDER BY templates_instances.created_at DESC
LIMIT $4
OFFSET COALESCE($5, 0)
