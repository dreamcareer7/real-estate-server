WITH ins AS (
  INSERT INTO users_settings (
    "user",
    brand
  ) VALUES (
    $1::uuid,
    $2::uuid
  )
  ON CONFLICT DO NOTHING
  RETURNING id
)
SELECT
  users_settings.id
FROM
  users_settings
WHERE
  "user" = $1::uuid
  AND brand = $2::uuid
