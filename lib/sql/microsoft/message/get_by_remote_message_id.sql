SELECT
  id
FROM
  microsoft_messages
WHERE
  microsoft_credential = $1
  AND message_id = ANY($2)