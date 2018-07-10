INSERT INTO contact_search_lists (
    "user",
    filters,
    query,
    name,
    is_pinned
) VALUES (
    $1,
    $2,
    $3,
    $4,
    $5
) RETURNING id