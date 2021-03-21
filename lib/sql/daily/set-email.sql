UPDATE dailies SET email = $2 WHERE id = $1 AND email IS NULL
RETURNING id
