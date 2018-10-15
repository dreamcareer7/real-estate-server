SELECT
  brands_forms_templates.*,
  'form_template' as type
FROM brands_forms_templates
WHERE
  brand IN (SELECT brand_parents($1::uuid))
  AND form = $2::uuid
ORDER BY name
