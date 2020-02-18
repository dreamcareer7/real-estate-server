UPDATE brands_allowed_templates SET
  thumbnail = $2,
  preview = $3
WHERE id = $1
