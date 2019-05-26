UPDATE
  google_credentials
SET
  last_profile_sync_at = $1
WHERE
  id = $2