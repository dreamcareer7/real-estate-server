SELECT
  *,
  (
    SELECT
      JSON_AGG(brands_checklists_tasks.*)
    FROM
      brands_checklists_tasks
    WHERE
      checklist = brands_checklists.id
  ) as tasks
FROM brands_checklists
WHERE brand = $1 AND flags && $2
ORDER BY "order" ASC