INSERT INTO files
(path, name, created_by) VALUES ($1, $2, $3)
RETURNING id