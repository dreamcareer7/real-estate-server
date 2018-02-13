SELECT deals_checklists.*,
  'deal_checklist' AS type,
  EXTRACT(EPOCH FROM created_at) AS created_at,
  EXTRACT(EPOCH FROM updated_at) AS updated_at,
  EXTRACT(EPOCH FROM deleted_at) AS deleted_at,

  deactivated_at IS NOT NULL is_deactivated,
  terminated_at  IS NOT NULL is_terminated,

  (
    SELECT
      ARRAY_AGG(id ORDER BY tasks.created_at)
    FROM tasks
    WHERE
      checklist = deals_checklists.id
      AND tasks.deleted_at IS NULL
  ) AS tasks,

  (
    SELECT ARRAY_AGG(form) FROM brands_checklists_allowed_forms WHERE checklist = deals_checklists.origin
  ) as allowed_forms,

  (
    SELECT is_deactivatable FROM brands_checklists WHERE id = deals_checklists.origin
  ) as is_deactivatable,

  (
    SELECT is_terminatable FROM brands_checklists WHERE id = deals_checklists.origin
  ) as is_terminatable,

  (
    SELECT tab_name FROM brands_checklists WHERE id = deals_checklists.origin
  ) as tab_name,

  (
    SELECT deal_type FROM brands_checklists WHERE id = deals_checklists.origin
  ) as checklist_type

FROM deals_checklists
JOIN unnest($1::uuid[]) WITH ORDINALITY t(did, ord) ON deals_checklists.id = did
ORDER BY t.ord
