WITH to_delete AS (
  DELETE FROM brands_deal_statuses_checklists
  WHERE status = $1 AND checklist IN(SELECT id FROM brands_checklists WHERE brand = $9)
),

status AS (
  UPDATE brands_deal_statuses SET
    label = $2,
    admin_only = $3,
    is_archived = $4,
    is_active = $5,
    is_pending = $6,
    is_closed = $7
  WHERE id = $1
)

INSERT INTO brands_deal_statuses_checklists
(status, checklist)
SELECT $1, UNNEST($8::uuid[])
