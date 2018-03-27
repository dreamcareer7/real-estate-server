UPDATE search_filters SET
    filters = $3,
    name = $4,
    is_pinned = $5,
    updated_at = clock_timestamp()
WHERE id = $1 AND user_id = $2