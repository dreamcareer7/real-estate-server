SELECT
  id
FROM
  contacts_attribute_defs
WHERE
  deleted_at IS NULL
  AND "global" = true
ORDER BY created_at DESC