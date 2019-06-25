INSERT INTO
  crm_tags (
    brand,
    created_by,
    created_within,
    tag
  )
VALUES (
  $1::uuid,
  $2::uuid,
  $3::text,
  $4::text
)
