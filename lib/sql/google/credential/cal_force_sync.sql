-- deprecated, we use users_jobs row level lock technique

UPDATE
  google_credentials
SET
  calendars_last_sync_at = null
WHERE
  id = $1