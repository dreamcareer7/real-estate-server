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
      ARRAY_AGG(form)
    FROM
      brands_checklists_allowed_forms
    WHERE checklist = brands_checklists.id AND deleted_at IS NULL
  ) as allowed_forms

FROM brands_checklists
JOIN unnest($1::uuid[]) WITH ORDINALITY t(bid, ord) ON brands_checklists.id = bid
ORDER BY t.ord
