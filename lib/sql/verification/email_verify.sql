WITH verification AS (
  SELECT *
  FROM email_verifications
  WHERE
    code  = $1 AND
    email = $2 AND
    ((NOW() - created_at) < '1 day'::interval)
  LIMIT 1
),
verified AS (
    UPDATE users
    SET email_confirmed = TRUE
    WHERE email = (SELECT email FROM verification)
)
DELETE FROM email_verifications WHERE email = (SELECT email FROM verification)
