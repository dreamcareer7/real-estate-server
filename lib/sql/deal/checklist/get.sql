SELECT deals_checklists.*,
  'deal_checklist' AS type,
  EXTRACT(EPOCH FROM deals_checklists.created_at) AS created_at,
  EXTRACT(EPOCH FROM deals_checklists.updated_at) AS updated_at,
  EXTRACT(EPOCH FROM deals_checklists.deleted_at) AS deleted_at,

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

  -- Only offers can be deactivated
  (
    origins.checklist_type = 'Offer'
  ) as is_deactivatable,

  -- Only offers can be terminated
  (
    origins.checklist_type = 'Offer'
  ) as is_terminatable,

  origins.checklist_type,

  origins.tab_name,

  (
    deals_checklists.deactivated_at     IS NULL
    AND deals_checklists.terminated_at  IS NULL
    AND deals_checklists.deleted_at     IS NULL
    AND origins.checklist_type = 'Offer'
  ) as is_active_offer

FROM deals_checklists
FULL JOIN brands_checklists origins ON deals_checklists.origin = origins.id
JOIN unnest($1::uuid[]) WITH ORDINALITY t(did, ord) ON deals_checklists.id = did
ORDER BY t.ord
