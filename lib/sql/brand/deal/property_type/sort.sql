WITH items AS (
  SELECT
  id,
  "order"
  FROM json_populate_recordset(NULL::brands_property_types, $1::json)
)

UPDATE brands_property_types SET
"order" = items.order
FROM items
WHERE brands_property_types.id = items.id
