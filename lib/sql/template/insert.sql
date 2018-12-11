INSERT INTO templates
(name, variant, template_type, medium, inputs, brand)
VALUES
($1, $2, $3, $4, $5, $6)
RETURNING id
