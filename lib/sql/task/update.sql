UPDATE tasks SET
  title = $2,
  status = $3,
  review = $4,
  submission = $5,
  updated_at = CLOCK_TIMESTAMP()
WHERE id = $1
