UPDATE
  showings_roles
SET
  deleted_at = now()
WHERE
  id = $1::uuid;
