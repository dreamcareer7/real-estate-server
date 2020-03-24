UPDATE
  microsoft_credentials
SET
  send_email_after = $2
WHERE
  id = $1