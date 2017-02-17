SELECT id FROM deals
WHERE
  deleted_at IS NULL
  AND created_by IN(SELECT get_brand_users($1))
ORDER BY updated_at DESC