SELECT id FROM deals
WHERE
  deleted_at IS NULL
  AND brand IN(SELECT brand_children($1))
ORDER BY updated_at DESC