UPDATE brands_allowed_templates SET
thumbnail_requested_at = NOW(),
is_thumbnail_ready = FALSE
WHERE brand = $1
