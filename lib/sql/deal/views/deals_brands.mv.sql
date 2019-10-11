CREATE MATERIALIZED VIEW deals_brands AS (
  (
    SELECT
      d.id AS deal,
      bp.brand
    FROM
      deals d,
      brand_parents(d.brand) bp(brand)
    WHERE
      d.deleted_at IS NULL
  ) UNION (
    SELECT
      deals.id AS deal,
      bp.brand
    FROM
      deals
      LEFT JOIN deals_roles
        ON deals.id = deals_roles.deal
      LEFT JOIN deals_checklists
        ON deals_roles.checklist = deals_checklists.id
      CROSS JOIN LATERAL brand_parents(deals_roles.brand) bp(brand)
    WHERE
      deals_roles.brand IS NOT NULL
      AND deals_roles.deleted_at IS NULL
      AND deals_checklists.deactivated_at IS NULL
      AND deals_checklists.terminated_at IS NULL
  )
)
