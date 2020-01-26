INSERT INTO
  brands_settings (
    created_by,
    updated_by,
    created_within,
    updated_within,
    brand,
    "key",
    number,
    text,
    boolean,
    date
  )
VALUES (
  $1::uuid,
  $1::uuid,
  $2,
  $2,
  $3::uuid,
  $4,
  $5,
  $6,
  $7,
  $8
)
ON CONFLICT (brand, "key") DO UPDATE
  SET
    updated_at = now(),
    updated_by = $1,
    updated_within = $2,
    number = $5,
    text = $6,
    boolean = $7,
    date = $8
