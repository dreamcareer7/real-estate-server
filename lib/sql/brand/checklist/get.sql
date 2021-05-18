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
    WHERE
      checklist = brands_checklists.id
      AND is_required IS TRUE
      AND deleted_at IS NULL
  ) as required_contexts,

  (
    SELECT
      ARRAY_AGG(context)
    FROM
      brands_contexts_checklists
    WHERE
      checklist = brands_checklists.id
      AND is_required IS FALSE
      AND deleted_at IS NULL
  ) as optional_contexts,

  (
    SELECT ARRAY_AGG(status)
    FROM
      brands_deal_statuses_checklists
    WHERE checklist = brands_checklists.id
  ) as statuses

FROM brands_checklists
JOIN unnest($1::uuid[]) WITH ORDINALITY t(bid, ord) ON brands_checklists.id = bid
ORDER BY t.ord
