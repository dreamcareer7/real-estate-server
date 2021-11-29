INSERT INTO users_settings (
  "user",
  brand
) VALUES (
  $1::uuid,
  $2::uuid
)
ON CONFLICT ("user", brand) DO UPDATE
SET
  updated_at = CLOCK_TIMESTAMP()
RETURNING id
