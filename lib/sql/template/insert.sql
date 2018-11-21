INSERT INTO templates
(name, width, height, brand, template_type, medium)
VALUES
($1, $2, $3, $4, $5, $6)
RETURNING id
