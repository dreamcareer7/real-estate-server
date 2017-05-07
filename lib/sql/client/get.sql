WITH c AS (
  SELECT
  DISTINCT ON(id)
  *
  FROM clients
  WHERE id = ANY($1::uuid[])
  ORDER BY id DESC
)

SELECT * FROM c
JOIN unnest($1::uuid[]) WITH ORDINALITY t(cid, ord) ON c.id = cid
ORDER BY t.ord