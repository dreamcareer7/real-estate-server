INSERT INTO
  brands_flows (
    created_by,
    brand,
    name,
    description,
    created_within,
    updated_within
  )
VALUES (
  $1::uuid,
  $2::uuid,
  $3::text,
  $4::text,
  $5::text,
  $5::text
)
RETURNING
  id
