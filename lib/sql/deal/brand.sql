SELECT
  id
FROM deals
WHERE
  brand IN(SELECT brand_children($1))
ORDER BY updated_at DESC