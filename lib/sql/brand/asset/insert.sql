INSERT INTO brands_assets (created_by, brand, file, label, template_type, medium) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id
