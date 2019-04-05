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

  -- The only reason we terminate or deactivate a checklist
  -- is to open room for new offers.
  -- But since there are no offers on a Buying deal
  -- terminating their checklists results in an emppy deal
  -- with no context, no status, no roles, etc
  -- Therefore, we only allow deactivation and termination on
  -- Seller side deals
  (
    SELECT
      brands_checklists.is_deactivatable AND deals.deal_type = 'Selling'
      FROM brands_checklists
      JOIN deals_checklists dc ON dc.origin = brands_checklists.id
      JOIN deals               ON dc.deal   = deals.id
      WHERE dc.id = deals_checklists.id
  ) as is_deactivatable,

  (
    SELECT
      brands_checklists.is_terminatable AND deals.deal_type = 'Selling'
      FROM brands_checklists
      JOIN deals_checklists dc ON dc.origin = brands_checklists.id
      JOIN deals               ON dc.deal   = deals.id
      WHERE dc.id = deals_checklists.id
  ) as is_terminatable,

  (
    SELECT tab_name FROM brands_checklists WHERE id = deals_checklists.origin
  ) as tab_name,

  (
    SELECT deal_type FROM brands_checklists WHERE id = deals_checklists.origin
  ) as checklist_type,

  (
    deactivated_at     IS NULL
    AND terminated_at  IS NULL
    AND deleted_at     IS NULL
    AND (SELECT deal_type FROM brands_checklists WHERE id = deals_checklists.origin) = 'Buying'
  ) as is_active_offer

FROM deals_checklists
JOIN unnest($1::uuid[]) WITH ORDINALITY t(did, ord) ON deals_checklists.id = did
ORDER BY t.ord
