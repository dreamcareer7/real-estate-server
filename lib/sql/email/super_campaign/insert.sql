INSERT INTO super_campaigns (
  created_by,
  brand,
  subject,
  template_instance
) VALUES (
  $1::uuid,
  $2::uuid,
  $3,
  $4::uuid
) RETURNING id
