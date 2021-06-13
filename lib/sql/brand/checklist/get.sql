SELECT brands_checklists.*,
  'brand_checklist' AS TYPE,
  EXTRACT(EPOCH FROM created_at) AS created_at,

  (
    SELECT
      JSON_AGG(brands_checklists_tasks ORDER BY "order")
    FROM
      brands_checklists_tasks
    WHERE
      checklist = brands_checklists.id
      AND deleted_at IS NULL
  ) as tasks,

  (
    SELECT
      ARRAY_AGG(context)
    FROM
      brands_contexts_checklists
      JOIN brands_contexts ON brands_contexts.id = brands_contexts_checklists.context
    WHERE
      checklist = brands_checklists.id
      AND is_required IS TRUE
      AND brands_contexts.deleted_at IS NULL
  ) as required_contexts,

  (
    SELECT
      ARRAY_AGG(context)
    FROM
      brands_contexts_checklists
      JOIN brands_contexts ON brands_contexts.id = brands_contexts_checklists.context
    WHERE
      checklist = brands_checklists.id
      AND is_required IS FALSE
      AND brands_contexts.deleted_at IS NULL
  ) as optional_contexts,

  (
    SELECT ARRAY_AGG(status ORDER BY is_active DESC, is_pending DESC, is_archived DESC, label ASC)
    FROM
      brands_deal_statuses_checklists
    JOIN brands_deal_statuses ON brands_deal_statuses_checklists.status = brands_deal_statuses.id
    WHERE checklist = brands_checklists.id
  ) as statuses

FROM brands_checklists
JOIN unnest($1::uuid[]) WITH ORDINALITY t(bid, ord) ON brands_checklists.id = bid
ORDER BY t.ord
