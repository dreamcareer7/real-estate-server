INSERT INTO contact_search_lists (
    "user",
    filters,
    name,
    is_pinned
) VALUES (
    $1,
    $2,
    $3,
    $4
) RETURNING id