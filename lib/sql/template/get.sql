WITH te AS (
  SELECT
  DISTINCT ON(id)
  templates.*,
  'template' as type
  FROM templates
  WHERE id = ANY($1::uuid[])
  ORDER BY id DESC
)
SELECT te.* FROM te
JOIN unnest($1::uuid[]) WITH ORDINALITY t(tid, ord) ON te.id = tid
ORDER BY t.ord
