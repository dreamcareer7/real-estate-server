UPDATE users
SET email_confirmed = TRUE
WHERE id = $1
