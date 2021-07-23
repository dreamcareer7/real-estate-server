WITH items AS (
  SELECT
  id,
  "order"
  FROM json_populate_recordset(NULL::brands_contexts, $1::json)
)

UPDATE brands_contexts SET
"order" = items.order
FROM items
WHERE brands_contexts.id = items.id
