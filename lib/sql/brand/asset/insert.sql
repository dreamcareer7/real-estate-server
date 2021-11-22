INSERT INTO brands_assets (created_by, brand, file, label, template_type, medium)
SELECT $1, UNNEST($2::uuid[]), $3, $4, $5, $6
RETURNING id
