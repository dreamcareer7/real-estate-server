SELECT
  id
FROM
  contact_search_lists
WHERE
  "user" = $1
  AND deleted_at IS NULL
ORDER BY
  is_pinned DESC,
  created_at