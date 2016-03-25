WITH verified AS (
    UPDATE users
    SET email_confirmed = TRUE
    WHERE email = $2 AND
    EXISTS (
        SELECT id
        FROM email_verifications
        WHERE code  = $1 AND
              email = $2 AND
              ((NOW() - created_at) < '1 day'::interval)
    )
)
DELETE FROM email_verifications
WHERE code = $1 AND
      email = $2
