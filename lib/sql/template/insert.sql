INSERT INTO templates
(name, variant, template_type, medium, inputs)
VALUES
($1, $2, $3, $4, $5)
RETURNING id
