SELECT
  id
FROM
  contact_search_lists
WHERE
  deleted_at IS NULL
  AND brand = ANY($1::uuid[])
ORDER BY
  is_pinned DESC,
  created_at