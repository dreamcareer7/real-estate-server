SELECT deals_checklists.*,
  'deal_checklist' AS type,
  EXTRACT(EPOCH FROM created_at) AS created_at,
  EXTRACT(EPOCH FROM updated_at) AS updated_at,
  EXTRACT(EPOCH FROM deleted_at) AS deleted_at,
  (
    SELECT ARRAY_AGG(id ORDER BY "order") FROM tasks WHERE checklist = deals_checklists.id
  ) AS tasks

FROM deals_checklists
JOIN unnest($1::uuid[]) WITH ORDINALITY t(did, ord) ON deals_checklists.id = did
ORDER BY t.ord
