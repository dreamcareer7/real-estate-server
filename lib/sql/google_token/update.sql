 UPDATE google_tokens
 SET access_token = $1,
    refresh_token = $2,
    expiry_date = $3
WHERE id = $4
