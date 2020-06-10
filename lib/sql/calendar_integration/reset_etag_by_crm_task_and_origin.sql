UPDATE
  calendar_integration
SET
  local_etag = NULL,
  updated_at = now()
WHERE
  crm_task = ANY($1::uuid[])
  AND origin <> $2