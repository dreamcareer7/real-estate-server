UPDATE gallery_items SET
  updated_at = NOW(),
  name = $2,
  description = $3,
  "order" = $4,
  file = $5
WHERE id = $1
