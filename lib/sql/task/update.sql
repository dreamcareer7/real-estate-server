UPDATE tasks SET
  title = $2,
  status = $3,
  review = $4,
  submission = $5,
  needs_attention = $6,
  updated_at = CLOCK_TIMESTAMP()
WHERE id = $1
