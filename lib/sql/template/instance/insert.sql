INSERT INTO templates_instances
(origin, html, created_by, url)
VALUES
($1, $2, $3, $4)
RETURNING id
