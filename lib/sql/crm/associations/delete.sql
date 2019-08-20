UPDATE
  crm_associations
SET
  deleted_at = NOW(),
  deleted_by = $3::uuid
WHERE
  id = ANY($1)
  AND crm_task = $2
RETURNING
  crm_task,
  contact,
  deal,
  listing,
  email,
  deleted_by AS created_by
