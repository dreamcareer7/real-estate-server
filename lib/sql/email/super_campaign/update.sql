UPDATE
  super_campaigns
SET
  subject = $2,
  description = $3,
  due_at = to_timestamp($4),
  template_instance = $5::uuid
WHERE
  id = $1::uuid
