WITH status AS (
  INSERT INTO brands_deal_statuses
  (brand, label, admin_only, is_archived, is_active, is_pending)
  VALUES
  ($1, $2, $3, $4, $5, $6)
  RETURNING id
),

checklists AS (
  INSERT INTO brands_deal_statuses_checklists
  (status, checklist)
  SELECT
    (SELECT id FROM status),
    UNNEST($7::uuid[])
)

SELECT * FROM status
