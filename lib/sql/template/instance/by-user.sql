SELECT
  *,
  COUNT(*) OVER()::INT as total
FROM templates_instances
JOIN templates ON templates_instances.template = templates.id
WHERE created_by = $1
AND deleted_at IS NULL
AND $2 IS NULL OR templates.medium IN($2::template_medium)
AND $3 IS NULL OR templates.medium IN($3::template_type)
ORDER BY created_at DESC
LIMIT $4
OFFSET COALESCE($5, 0)
