SELECT DISTINCT templates.id, templates.created_at FROM templates
JOIN brands_allowed_templates bat ON templates.id = bat.template
WHERE
  bat.brand IN (SELECT * FROM brand_parents($1))
  AND ($2::template_type[]   IS NULL OR $2 @> ARRAY[template_type])
  AND ($3::template_medium[] IS NULL OR $3 @> ARRAY[medium])
  AND deleted_at IS NULL
ORDER BY templates.id, templates.created_at DESC
