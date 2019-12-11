UPDATE email_campaigns SET
  thread_key = $2
WHERE
  id = $1