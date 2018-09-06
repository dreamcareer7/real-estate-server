UPDATE contact_search_lists
SET
  deleted_at = clock_timestamp(),
  deleted_by = $2::uuid
WHERE id = $1