INSERT INTO brands_forms_templates
(name, deal_types, property_types, brand, form, submission)
VALUES
($1, $2, $3, $4, $5, $6)
RETURNING id
