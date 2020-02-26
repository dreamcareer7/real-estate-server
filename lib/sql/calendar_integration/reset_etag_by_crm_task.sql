UPDATE
  calendar_integration
SET
  local_etag = NULL,
  updated_at = now()
WHERE
  crm_task = $1