SELECT
  distinct (microsoft_credential)
FROM
  microsoft_messages
WHERE
  thread_key = ANY($1::text[])