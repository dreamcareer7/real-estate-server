UPDATE
  crm_associations
SET
  deleted_at = NOW(),
  deleted_by = $2::uuid
WHERE
  id = ANY($1::uuid[])
RETURNING
  crm_task,
  contact,
  deal,
  listing,
  email,
  deleted_by AS created_by
