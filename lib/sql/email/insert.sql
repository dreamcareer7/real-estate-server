INSERT INTO emails
("from", "to", subject, html, text, headers)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING id;