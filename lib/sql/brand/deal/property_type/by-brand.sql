SELECT id FROM brands_property_types
WHERE brand IN (SELECT brand_parents($1::uuid))
AND deleted_at IS NULL
ORDER BY "order", label;
