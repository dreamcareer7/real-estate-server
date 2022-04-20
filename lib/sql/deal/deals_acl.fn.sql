CREATE OR REPLACE FUNCTION deals_acl("user" uuid) RETURNS TABLE(
  deal uuid,
  brand uuid,
  acl task_acl
)
AS
$$
  SELECT deals.id as deal, deals.brand, 'BackOffice'::task_acl as acl FROM deals
    WHERE deals.brand IN(SELECT user_brands($1, ARRAY['Admin']))
       OR deals.brand IN(SELECT user_brands($1, ARRAY['BackOffice']))

  UNION ALL

  SELECT deals.id as deal, deals.brand, 'Agents'::task_acl as acl FROM deals
    WHERE deals.brand IN(SELECT user_brands($1::uuid, ARRAY['Deals']))

  UNION ALL

  SELECT deals.id as deal, deals_roles.brand, 'Agents'::task_acl as acl FROM deals
    JOIN deals_roles ON deals.id = deals_roles.deal AND (
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
    LEFT JOIN deals_checklists ON
      deals_roles.checklist = deals_checklists.id
      AND
      (
        deals_roles.deleted_at          IS NULL
        AND deals_checklists.deactivated_at IS NULL
        AND deals_checklists.terminated_at  IS NULL
      )
    WHERE deals_roles.brand IN (SELECT user_brands($1::uuid, ARRAY['Deals']))
$$
LANGUAGE sql STABLE;
