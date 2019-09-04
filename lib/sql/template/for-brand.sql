WITH limited_templates AS (
  SELECT DISTINCT template FROM brands_allowed_templates
),

uniques AS (
  SELECT templates.id, templates.created_At FROM templates
  FULL JOIN brands_allowed_templates bat ON templates.id = bat.template
  WHERE
    (
      bat.brand  IN (SELECT * FROM brand_parents($1)) OR
      templates.id NOT IN(SELECT template FROM limited_templates)
    )
    AND ($2::template_type[]   IS NULL OR $2 @> ARRAY[template_type])
    AND ($3::template_medium[] IS NULL OR $3 @> ARRAY[medium])
    AND deleted_at IS NULL
  ORDER BY templates.id
)

SELECT id FROM uniques ORDER BY created_at DESC
