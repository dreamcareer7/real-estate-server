UPDATE templates_instances
SET branch = $2
WHERE id IN ($1::uuid[])
