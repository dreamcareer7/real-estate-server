UPDATE
  calendar_integration
SET
  deleted_at = now(),
  updated_at = now()
WHERE
  id = ANY($1::uuid[])