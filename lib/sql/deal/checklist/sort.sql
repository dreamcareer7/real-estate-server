WITH items AS (
  SELECT
  id,
  "order"
  FROM json_populate_recordset(NULL::tasks, $2::json)
)

UPDATE tasks SET
"order" = items.order
FROM items
WHERE tasks.id = items.id AND tasks.checklist = $1
