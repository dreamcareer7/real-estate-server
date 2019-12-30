INSERT INTO gallery_items
(gallery, name, description, "order", file)

SELECT
  gallery,
  name,
  description,
  "order",
  file
FROM json_populate_recordset(NULL::gallery_items, $1::json)

RETURNING id
