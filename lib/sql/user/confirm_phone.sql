UPDATE users
SET phone_confirmed = TRUE
WHERE id = $1
