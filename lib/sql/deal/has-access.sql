WITH user_brands AS (
  SELECT brand FROM user_brands($2::uuid, NULL)
)

SELECT
  count(*) > 0 AS has_access
FROM deals
LEFT JOIN deals_roles      ON deals.id = deals_roles.deal
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
