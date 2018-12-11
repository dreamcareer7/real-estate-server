INSERT INTO users_settings
  ("user", brand, key, value)
VALUES (
  $1::uuid,
  $2::uuid,
  $3,
  $4::json
)
ON CONFLICT ON CONSTRAINT users_settings_pkey DO UPDATE SET
  value = $4::json,
  updated_at = NOW()
RETURNING *
