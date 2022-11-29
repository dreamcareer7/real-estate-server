SELECT id FROM brands_assets 
WHERE deleted_at IS NULL 
AND brand IN((SELECT brand_parents(brand_ids) FROM UNNEST($1::uuid[]) brand_ids))
AND ($2::template_type[] IS NULL OR template_type = ANY($2))
AND ($3::template_medium[] IS NULL OR medium = ANY($3))
