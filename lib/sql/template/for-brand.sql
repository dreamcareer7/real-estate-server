WITH limited_templates AS (
  SELECT DISTINCT template FROM brands_allowed_templates
)
SELECT templates.id FROM templates
FULL JOIN brands_allowed_templates bat ON templates.id = bat.template
WHERE
  (
    bat.brand  = $1 OR
    templates.id NOT IN(SELECT template FROM limited_templates)
  )
  AND ($2::template_type[]   IS NULL OR $2 @> ARRAY[template_type])
  AND ($3::template_medium[] IS NULL OR $3 @> ARRAY[medium])
  AND deleted_at IS NULL
ORDER BY templates.id
