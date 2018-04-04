SELECT
    id
FROM search_filters
WHERE user_id = $1 AND deleted_at IS NULL