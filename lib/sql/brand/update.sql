UPDATE brands SET
  name = $2,
  palette = $3,
  assets = $4,
  messages = $5,
  brand_type = $6
WHERE id = $1
