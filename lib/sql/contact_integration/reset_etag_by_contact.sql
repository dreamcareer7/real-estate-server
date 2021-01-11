UPDATE
  contact_integration
SET
  local_etag = NULL,
  updated_at = now()
WHERE
  contact = ANY($1::uuid[])