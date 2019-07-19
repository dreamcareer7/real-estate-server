UPDATE google_credentials
SET
  messages_total = $1,
  threads_total = $2,
  history_id = $3
WHERE
  id = $4