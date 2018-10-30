INSERT INTO brokerwolf_settings
(
  brand,
  api_token,
  consumer_key,
  secret_key,
  client_code,
  host
)
VALUES
(
  $1,
  $2,
  $3,
  $4,
  $5,
  $6
) ON CONFLICT (brand) DO UPDATE
SET
  api_token = $2,
  consumer_key = $3,
  secret_key = $4,
  client_code = $5,
  host = $6
WHERE brokerwolf_settings.brand = $1
