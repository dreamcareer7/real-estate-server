UPDATE brands_allowed_templates SET
  thumbnail = $2,
  preview = $3,
  thumbnail_rendered_at = NOW()
WHERE id = $1
