UPDATE users
SET password = $2,
    email_confirmed = true
WHERE id = $1
