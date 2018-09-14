UPDATE contact_search_lists
SET
  deleted_at = clock_timestamp()
WHERE id = ANY($1::uuid[])
