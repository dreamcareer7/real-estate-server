SELECT  'google_token' AS type,
google_tokens.* FROM google_tokens
WHERE calendar_id = $1
LIMIT 1
