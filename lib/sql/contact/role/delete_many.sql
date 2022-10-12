-- $1: uuid[]

UPDATE contacts_roles SET
  deleted_at = now()
WHERE
  deleted_at IS NULL AND
  id = ANY($1::uuid[])
