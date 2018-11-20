INSERT INTO templates_instances
(template, html, created_by, file)
VALUES
($1, $2, $3, $4)
RETURNING id
