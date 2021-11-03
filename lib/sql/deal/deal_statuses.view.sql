CREATE OR REPLACE VIEW deal_statuses AS (
   WITH deal_brands AS (
    SELECT d.id as deal, brand_parents(d.brand) as brand FROM deals d
  )
  SELECT
    DISTINCT ON (deals.id)
    deals.id as deal,
    cdc.key,
    cdc.text,

    bds.label,
    bds.is_active,
    bds.is_pending,
    bds.is_archived,
    bds.is_closed
  FROM deals
  JOIN current_deal_context cdc ON deals.id = cdc.deal AND cdc.key IN('listing_status', 'contract_status')
  LEFT JOIN deals_checklists checklists
    ON checklists.id = cdc.checklist AND checklists.deleted_at IS NULL AND checklists.terminated_at IS NULL AND checklists.deactivated_at IS NULL

  JOIN deal_brands ON deals.id = deal_brands.deal

  LEFT JOIN brands_deal_statuses bds ON bds.brand = deal_brands.brand
  AND  bds.label = cdc.text AND bds.deleted_at IS NULL

  ORDER BY deals.id, cdc.key = 'contract_status' DESC, cdc.created_at DESC
)