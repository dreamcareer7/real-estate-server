SELECT
  id
FROM deals
WHERE
  brand IN(SELECT brand_children($1))
  AND deleted_at IS NULL
ORDER BY updated_at DESC