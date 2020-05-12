UPDATE gallery_items SET
  updated_at = NOW(),
  name = $2,
  "order" = $3,
  file = $4
WHERE id = $1
