SELECT
  id
FROM
  google_messages
WHERE
  google_credential = $1
  AND thread_key = ANY($2::text[])