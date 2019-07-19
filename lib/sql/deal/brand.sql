SELECT      DISTINCT deals.id, deals.updated_at
FROM        deals
LEFT JOIN   deals_roles ON deals.id = deals_roles.deal
WHERE
  (
    deals.brand              IN(SELECT brand_children($1))
    OR (
          deals_roles.brand      IN(SELECT brand_children($1))
      AND deals_roles.deleted_at IS NULL
    )
  )
  AND deals.deleted_at       IS NULL


ORDER BY deals.updated_at DESC
