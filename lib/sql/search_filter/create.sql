INSERT INTO search_filters (
    user_id,
    filters,
    name,
    is_pinned
) VALUES (
    $1,
    $2,
    $3,
    $4
) RETURNING id