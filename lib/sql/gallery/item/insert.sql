INSERT INTO gallery_items
(gallery, name, "order", file)

SELECT
  gallery,
  name,
  "order",
  file
FROM json_populate_recordset(NULL::gallery_items, $1::json)

RETURNING id
