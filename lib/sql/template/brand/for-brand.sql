WITH allowed AS (
  SELECT
  DISTINCT ON(templates.id)
  bat.id,
  templates.created_at
  FROM brands_allowed_templates bat
  JOIN templates ON bat.template = templates.id
  WHERE
    bat.brand IN (SELECT * FROM brand_parents($1))
    AND ($2::template_type[]   IS NULL OR $2 @> ARRAY[templates.template_type])
    AND ($3::template_medium[] IS NULL OR $3 @> ARRAY[templates.medium])
    AND deleted_at IS NULL
  ORDER BY templates.id
)

SELECT * FROM allowed ORDER BY allowed.created_at DESC
