UPDATE
  google_credentials
SET
  cgroups_sync_token = $2
WHERE
  id = $1