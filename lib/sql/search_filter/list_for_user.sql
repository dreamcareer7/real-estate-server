SELECT
    id,
    filters,
    name,
    is_pinned
FROM search_filters
WHERE user_id = $1 AND deleted_at IS NULL