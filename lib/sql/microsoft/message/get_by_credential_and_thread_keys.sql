SELECT
  id
FROM
  microsoft_messages
WHERE
  microsoft_credential = $1
  AND thread_key = ANY($2::text[])