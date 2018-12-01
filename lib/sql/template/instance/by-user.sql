SELECT * FROM templates_instances
WHERE created_by = $1
ORDER BY created_at DESC
