UPDATE tasks SET
  title = $2,
  review = $3,
  submission = $4,
  needs_attention = $5,
  updated_at = CLOCK_TIMESTAMP()
WHERE id = $1 AND deleted_at IS NULL
