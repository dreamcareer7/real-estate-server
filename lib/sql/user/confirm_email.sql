UPDATE users
SET email_confirmed = TRUE,
    fake_email = FALSE
WHERE id = $1
