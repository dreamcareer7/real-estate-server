SELECT  'google_token' AS type,
google_tokens.* FROM google_tokens
WHERE "user" = $1
LIMIT 1
