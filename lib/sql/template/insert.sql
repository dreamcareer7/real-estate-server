INSERT INTO templates
(name, ratio, brand, template_type, template)
VALUES
($1, $2, $3, $4, $5)
RETURNING id