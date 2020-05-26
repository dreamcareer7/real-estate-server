WITH items AS (
  SELECT
  id,
  "order"
  FROM json_populate_recordset(NULL::brands_checklists_tasks, $1::json)
)

UPDATE brands_checklists_tasks SET
"order" = items.order
FROM items
WHERE brands_checklists_tasks.id = items.id
