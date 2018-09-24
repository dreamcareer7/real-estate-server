INSERT INTO contact_search_lists (
    "created_by",
    brand,
    filters,
    query,
    name,
    is_pinned,
    touch_freq
) VALUES (
    $1,
    $2,
    $3,
    $4,
    $5,
    $6,
    $7
) RETURNING id