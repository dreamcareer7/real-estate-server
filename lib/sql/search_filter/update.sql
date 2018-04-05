UPDATE search_filters SET
    filters = $2,
    name = $3,
    is_pinned = $4,
    updated_at = clock_timestamp()
WHERE id = $1