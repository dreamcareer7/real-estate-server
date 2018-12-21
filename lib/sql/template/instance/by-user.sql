SELECT * FROM templates_instances
WHERE created_by = $1
AND deleted_at IS NULL
ORDER BY created_at DESC
