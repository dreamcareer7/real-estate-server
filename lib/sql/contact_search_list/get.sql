SELECT
    id,
    filters,
    name,
    is_pinned
FROM contact_search_lists
WHERE id IN (SELECT UNNEST($1::uuid[]))