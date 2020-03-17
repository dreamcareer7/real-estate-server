SELECT
  id
FROM
  microsoft_messages
WHERE
  microsoft_credential = $1
  AND internet_message_id = ANY($2)