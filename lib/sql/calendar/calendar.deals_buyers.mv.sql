CREATE MATERIALIZED VIEW calendar.deals_buyers AS (
  SELECT
    d.id AS deal,
    d.title,
    dr.id AS role,
    dr.email,
    dr.phone_number,
    db.brand,
    dcl.id AS checklist
  FROM
    deals_checklists dcl
    JOIN deals d ON d.id = dcl.deal
    JOIN deals_brands db ON db.deal = d.id
    JOIN deals_roles dr ON dr.deal = d.id
  WHERE
    d.deleted_at IS NULL
    AND d.faired_at IS NOT NULL
    AND d.deal_type = 'Buying'::deal_type
    AND dcl.deleted_at IS NULL
    AND dcl.deactivated_at IS NULL
    AND dcl.terminated_at IS NULL
    AND dr.deleted_at IS NULL
    AND dr.role = 'Buyer'::deal_role
)
