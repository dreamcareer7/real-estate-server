INSERT INTO tokens (
  client,
  "user",
  token_type,
  expires_at
) VALUES (
  $1,
  $2,
  $3,
  $4
)

RETURNING token