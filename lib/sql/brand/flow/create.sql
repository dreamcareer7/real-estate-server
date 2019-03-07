INSERT INTO
  brands_flows (
    created_by,
    brand,
    name,
    description
  )
VALUES (
  $1::uuid,
  $2::uuid,
  $3::text,
  $4::text
)
RETURNING
  id
