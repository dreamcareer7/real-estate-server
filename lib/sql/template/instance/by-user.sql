SELECT * FROM templates_instances
WHERE created_by = 'ca2933ea-9d82-11e5-b8da-f23c91c841bd'
AND deleted_at IS NULL
ORDER BY created_at DESC
LIMIT $2
OFFSET COALESCE($3, 0)
