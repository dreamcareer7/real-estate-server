SELECT id FROM brands_form_templates bat
JOIN brand_parents($1) parents ON bat.brand = parents
WHERE form = $2 AND deleted_at IS NULL
ORDER BY parents DESC
