INSERT INTO super_campaigns (
  created_by,
  brand,
  subject,
  include_signature,
  template_instance
) VALUES (
  $1::uuid,
  $2::uuid,
  $3,
  $4::boolean,
  $5,
  $6::uuid
) RETURNING id
