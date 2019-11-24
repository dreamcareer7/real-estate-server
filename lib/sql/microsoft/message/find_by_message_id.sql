SELECT
  id
FROM
  microsoft_messages
WHERE
  message_id = $1
  AND google_credential = $2
