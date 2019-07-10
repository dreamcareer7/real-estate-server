INSERT INTO
  brands_settings (
    created_by,
    updated_by,
    created_within,
    updated_within,
    brand,
    "key",
    value
  )
VALUES (
  $1::uuid,
  $1::uuid,
  $2,
  $2,
  $3::uuid,
  $4,
  $5::jsonb
)
ON CONFLICT (brand, "key") DO UPDATE
  SET
    updated_at = now(),
    updated_within = $2,
    "value" = $5::jsonb
