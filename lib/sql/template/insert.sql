INSERT INTO templates
(name, variant, template_type, medium, inputs, file,url)
VALUES
($1, $2, $3, $4, $5, $6, $7)
RETURNING id
