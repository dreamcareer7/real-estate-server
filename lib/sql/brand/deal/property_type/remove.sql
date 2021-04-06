UPDATE brands_property_types SET
deleted_at = COALESCE(deleted_at, NOW())
WHERE id = $1
