UPDATE
  crm_associations
SET
  deleted_at = NOW(),
  deleted_by = $3
WHERE
  id = ANY($1)
  AND crm_task = $2
RETURNING
  crm_task,
  contact,
  deal,
  listing
