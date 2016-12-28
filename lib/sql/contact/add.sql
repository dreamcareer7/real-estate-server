INSERT INTO contacts("user")
VALUES ($1)
RETURNING id
