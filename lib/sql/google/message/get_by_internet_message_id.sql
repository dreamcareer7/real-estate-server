SELECT
  id
FROM
  google_messages
WHERE
  google_credential = $1
  AND internet_message_id = ANY($2)