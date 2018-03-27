UPDATE search_filters
SET
  deleted_at = clock_timestamp()
WHERE id = $1 AND user_id = $2