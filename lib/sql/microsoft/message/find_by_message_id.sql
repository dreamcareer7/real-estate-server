SELECT
  id
FROM
  microsoft_messages
WHERE
  message_id = $1
  AND microsoft_credential = $2
