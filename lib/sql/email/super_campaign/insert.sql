INSERT INTO super_campaigns (
  created_by,
  brand,
  subject,
  description,
  due_at,
  tags,
  template_instance
) VALUES (
  $1::uuid,
  $2::uuid,
  $3,
  $4,
  to_timestamp($5),
  $6::text[],
  $7::uuid
) RETURNING id
