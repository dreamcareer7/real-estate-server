DELETE FROM super_campaigns_allowed_tags WHERE
  brand = $1::uuid AND
  "user" = $2::uuid AND
  tag = $3::text
