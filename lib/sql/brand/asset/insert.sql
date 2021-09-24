INSERT INTO brands_assets (created_by, brand, file, label, template_type) VALUES ($1, $2, $3, $4, $5) RETURNING id
