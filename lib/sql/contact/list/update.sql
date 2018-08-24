UPDATE contact_search_lists SET
  filters = $2,
  query = $3,
  name = $4,
  is_pinned = $5,
  touch_freq = $6,
  updated_at = now()
WHERE id = $1
RETURNING id