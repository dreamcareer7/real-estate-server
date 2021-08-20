INSERT INTO brand_triggers (
  brand,
  "user",
  created_by,
  template,
  template_instance,
  event_type,
  wait_for,
  subject
) VALUES (
  /* brand: */ $1::uuid,
  /* user: */ $2::uuid,
  /* created_by: */ $2::uuid,
  /* template: */ $3::uuid,
  /* template_instance: */ $4::uuid,
  /* event_type: */ $5::text,
  /* wait_for: */ $6::interval,
  /* subject: */ $7::text
) ON CONFLICT (brand, event_type) DO UPDATE SET
  "user" = $2::uuid,
  template = $3::uuid,
  template_instance = $4::uuid,
  wait_for = $6::interval,
  subject = $7::text,
  updated_at = now()
RETURNING id
