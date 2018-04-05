SELECT
  id
FROM
  contacts_attribute_defs
WHERE
  deleted_at IS NULL
  AND (
    "user" = $1
    OR "global" = true
  )
ORDER BY global, created_at DESC