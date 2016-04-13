UPDATE users
SET email_confirmed = TRUE,
    is_shadow = FALSE
WHERE id = $1
