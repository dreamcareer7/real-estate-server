UPDATE contact_search_lists SET
  filters = $2,
  query = $3,
  args = $4,
  name = $5,
  is_pinned = $6,
  touch_freq = $7,
  updated_at = now(),
  updated_by = $8::uuid
WHERE id = $1
RETURNING id
