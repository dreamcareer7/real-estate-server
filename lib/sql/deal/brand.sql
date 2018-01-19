SELECT
  id
FROM deals
WHERE
  brand IN(SELECT brand_children($1))
  AND (
    CASE WHEN $2::boolean IS TRUE
      THEN TRUE
    ELSE
      deals.deleted_at IS NULL
    END
  )
ORDER BY updated_at DESC