INSERT INTO email_verifications(code, email) VALUES ($1, $2)
RETURNING id
