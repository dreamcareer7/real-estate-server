UPDATE
  contact_lists_members
SET
  deleted_at = NOW()
WHERE
  contact = ANY($1::uuid[])
  AND deleted_at IS NULL