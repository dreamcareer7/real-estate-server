SELECT id FROM brands_contexts
WHERE brand IN (SELECT brand_parents($1::uuid))
