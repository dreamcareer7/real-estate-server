UPDATE users
SET is_shadow = $2
WHERE id = $1
