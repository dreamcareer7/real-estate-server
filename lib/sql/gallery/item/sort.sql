WITH items AS (
  SELECT
  id,
  "order"
  FROM json_populate_recordset(NULL::gallery_items, $1::json)
)

UPDATE gallery_items SET
"order" = items.order
FROM items
WHERE gallery_items.id = items.id
