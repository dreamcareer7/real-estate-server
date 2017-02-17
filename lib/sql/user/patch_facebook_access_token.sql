UPDATE users
SET facebook_access_token = $2,
    updated_at = CLOCK_TIMESTAMP()
WHERE id = $1
