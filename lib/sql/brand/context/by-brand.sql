SELECT id FROM brands_contexts
WHERE brand IN (SELECT brand_parents($1::uuid))
AND deleted_at IS NULL
ORDER BY "order"
