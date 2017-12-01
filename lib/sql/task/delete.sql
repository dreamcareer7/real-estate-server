UPDATE tasks SET
  deleted_at = CLOCK_TIMESTAMP()
WHERE id = ANY($1::uuid[]) AND deleted_at IS NULL
