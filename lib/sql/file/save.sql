INSERT INTO files
(url, name, created_by) VALUES ($1, $2, $3)
RETURNING id