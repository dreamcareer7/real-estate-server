SELECT
    id,
    filters,
    name,
    is_pinned,
    'contact_list' AS "type"
FROM
    contact_search_lists
    JOIN
        unnest($1::uuid[])
        WITH ORDINALITY t(cid, ord)
        ON contact_search_lists.id = cid