 UPDATE google_tokens
 SET sync_token = $2
WHERE "user" = $1
