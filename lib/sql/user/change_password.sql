UPDATE users
SET password = $2,
    email_confirmed = true,
    is_shadow = $3
WHERE id = $1
