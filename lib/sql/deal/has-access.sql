WITH user_brands AS (
  SELECT brand FROM user_brands($2::uuid, NULL)
)

SELECT
  count(*) > 0 AS has_access
FROM deals
  LEFT JOIN deals_roles ON deals.id = deals_roles.deal AND deals_roles.deleted_at IS NULL AND (
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
LEFT JOIN deals_checklists ON deals_roles.checklist = deals_checklists.id
WHERE
  deals.id = $1
  AND (
    deals.brand       IN (SELECT brand FROM user_brands)
    OR
    (
      deals_roles.brand IN (SELECT brand FROM user_brands)
      AND deals_roles.deleted_at          IS NULL
      AND deals_checklists.deactivated_at IS NULL
      AND deals_checklists.terminated_at  IS NULL
    )
  )
