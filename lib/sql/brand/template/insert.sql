INSERT INTO brands_forms_templates (created_by, form, field, value, brand)
VALUES ($1, $2, $3, $4, $5)

ON CONFLICT(brand, form, field) DO UPDATE
SET value = $4 WHERE id = EXCLUDED.id

RETURNING id
