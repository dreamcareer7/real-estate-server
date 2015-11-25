INSERT INTO email_verifications(code, email)
    VALUES ($1, $2)
ON CONFLICT (email) DO UPDATE
    SET code = $1
    WHERE email_verifications.email = $2
RETURNING id
