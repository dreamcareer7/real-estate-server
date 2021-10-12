INSERT INTO
  super_campaigns_allowed_tags (
    brand,
    "user",
    tag
  )
  VALUES (
    $1::uuid,
    $2::uuid,
    $3::text
  )
ON CONFLICT DO NOTHING
