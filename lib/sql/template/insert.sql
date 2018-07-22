INSERT INTO templates
(name, width, height, thumbnail, brand, template_type, template)
VALUES
($1, $2, $3, $4, $5, $6, $7)
RETURNING id