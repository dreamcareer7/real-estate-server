UPDATE brands_allowed_templates SET
thumbnail = $1,
preview = $2
WHERE brand = $3 AND template = $4
