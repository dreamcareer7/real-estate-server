UPDATE tasks SET
  title = $2,
  review = $3,
  submission = $4,

  attention_requested_at = (
    CASE
      WHEN $5::boolean = false THEN NULL
      WHEN $5 IS NULL  THEN NULL
      WHEN attention_requested_at IS NULL AND $5 IS NOT NULL THEN CLOCK_TIMESTAMP()
      ELSE attention_requested_at
    END
  ),

  updated_at = CLOCK_TIMESTAMP()
WHERE id = $1 AND deleted_at IS NULL