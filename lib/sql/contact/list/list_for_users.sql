SELECT
  id
FROM
  unnest($1::uuid[]) AS t(created_by)
  JOIN contact_search_lists USING (created_by)
WHERE
  deleted_at IS NULL
ORDER BY
  is_pinned DESC,
  created_at
