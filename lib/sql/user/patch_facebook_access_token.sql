UPDATE users
SET facebook_access_token = $2,
    updated_at = NOW()
WHERE id = $1
