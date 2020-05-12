INSERT INTO brands_allowed_templates
(template, brand, thumbnail_requested_at)

SELECT id, $1, NOW() FROM templates WHERE is_shared IS TRUE
