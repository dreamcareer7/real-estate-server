INSERT INTO files
(path, name, created_by, public) VALUES ($1, $2, $3, $4)
RETURNING id