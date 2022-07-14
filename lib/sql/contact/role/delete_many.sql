-- $1: uuid[]

UPDATE contact_roles SET
  deleted_at = now()
WHERE
  deleted_at IS NULL AND
  id = ANY($1::uuid[])
