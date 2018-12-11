WITH te AS (
  SELECT
    DISTINCT ON(id)
    templates.*,
    'template' as type,
    inputs::text[] as inputs,
    EXTRACT(EPOCH FROM created_at) AS created_at,
    EXTRACT(EPOCH FROM created_at) AS updated_at -- Dan needs this to be present
  FROM templates
  WHERE id = ANY($1::uuid[])
  ORDER BY id DESC
)
SELECT te.* FROM te
JOIN unnest($1::uuid[]) WITH ORDINALITY t(tid, ord) ON te.id = tid
ORDER BY t.ord
