WITH te AS (
  SELECT
  DISTINCT ON(id)
  templates.*,
  'template' as type,

  -- Cast it to text[] so node-pg understands it
  -- Due to https://github.com/brianc/node-pg-types/issues/56
  template_types::text[] as template_types

  FROM templates
  WHERE id = ANY($1::uuid[])
  ORDER BY id DESC
)
SELECT te.* FROM te
JOIN unnest($1::uuid[]) WITH ORDINALITY t(tid, ord) ON te.id = tid
ORDER BY t.ord
