SELECT
    id,
    filters,
    name,
    is_pinned
FROM search_filters
WHERE id IN (SELECT UNNEST($1::uuid[]))