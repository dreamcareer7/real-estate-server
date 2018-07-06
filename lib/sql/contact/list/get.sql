SELECT
  id,
  EXTRACT(EPOCH FROM created_at) AS created_at,
  EXTRACT(EPOCH FROM updated_at) AS updated_at,
  EXTRACT(EPOCH FROM deleted_at) AS deleted_at,
  filters,
  query,
  name,
  is_pinned,
  'contact_list' AS "type"
FROM
  contact_search_lists
  JOIN
    unnest($1::uuid[])
    WITH ORDINALITY t(cid, ord)
    ON contact_search_lists.id = cid