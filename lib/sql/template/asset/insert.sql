INSERT INTO templates_assets
(created_by, template, file, listing, contact)
VALUES
($1, $2, $3, $4, $5)
RETURNING *
