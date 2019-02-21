INSERT INTO
  crm_tags (
    brand,
    created_by,
    tag
  )
VALUES (
  $1::uuid,
  $2::uuid,
  $3::text
)
