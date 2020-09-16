UPDATE brands_form_templates SET deleted_at = NOW()
WHERE form = $1 AND field = $2 AND brand = $3
