INSERT INTO brands_form_templates (created_by, brand, form, field, value)
VALUES ($1, $2, $3, $4, $5)

ON CONFLICT(brand, form, field) DO UPDATE
SET value = $4 WHERE brands_form_templates.id = EXCLUDED.id

RETURNING id
