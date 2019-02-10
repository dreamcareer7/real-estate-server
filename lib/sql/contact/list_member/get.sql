SELECT
  *
FROM
  crm_lists_members
WHERE
  list = ANY($1::uuid[])
  AND deleted_at IS NULL
