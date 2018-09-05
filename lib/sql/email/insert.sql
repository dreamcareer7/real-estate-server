INSERT INTO emails
(domain, "from", "to", subject, html, text, headers)
VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING id;