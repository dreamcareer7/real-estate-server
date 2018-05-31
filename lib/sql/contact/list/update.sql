UPDATE contact_search_lists SET
    filters = $2,
    name = $3,
    is_pinned = $4,
    updated_at = clock_timestamp()
WHERE id = $1
RETURNING id, filters, name, is_pinned