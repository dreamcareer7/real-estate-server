SELECT
  id
FROM
  unnest($1::uuid[]) AS t("user")
  JOIN contact_search_lists USING ("user")
WHERE
  deleted_at IS NULL
ORDER BY
  is_pinned DESC,
  created_at DESC