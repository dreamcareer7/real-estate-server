UPDATE users
SET password = $2,
    email_confirmed = true,
    is_shadow = false
WHERE id = $1
