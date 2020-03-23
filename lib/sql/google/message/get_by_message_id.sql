SELECT
  id
FROM
  google_messages
WHERE
  google_credential = $1
  AND message_id = ANY($2)
