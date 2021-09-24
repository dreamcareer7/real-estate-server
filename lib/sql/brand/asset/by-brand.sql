SELECT id FROM brands_assets 
WHERE deleted_at IS NULL 
AND brand IN(SELECT brand_parents($1))
AND ($2::template_type[] IS NULL OR template_type = ANY($2))
