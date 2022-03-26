SELECT      DISTINCT deals.id, deals.updated_at
FROM        deals
LEFT JOIN   deals_roles      ON deals.id = deals_roles.deal
LEFT JOIN   deals_checklists ON deals_roles.checklist = deals_checklists.id
WHERE
  (
    deals.brand              IN(SELECT brand_children($1))
    OR (
          deals_roles.brand      IN(SELECT brand_children($1))
      AND deals_roles.deleted_at          IS NULL
      AND deals_checklists.deactivated_at IS NULL
      AND deals_checklists.terminated_at  IS NULL
      AND ( -- This part prevents double ended deals from seeing each other
        (
          deals.deal_type = 'Selling' AND
          NOT (deals_roles.role IN('BuyerAgent', 'CoBuyerAgent'))
        )
        OR
        (
          deals.deal_type = 'Buying'  AND
          NOT (deals_roles.role IN ('SellerAgent'::deal_role, 'CoSellerAgent'::deal_role))
        )
      )
    )
  )
  AND deals.deleted_at       IS NULL


ORDER BY deals.updated_at DESC
LIMIT $2
