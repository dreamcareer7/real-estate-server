SELECT
  id
FROM
  crm_associations
WHERE
  deleted_at IS NULL
  AND crm_task = $1::uuid
