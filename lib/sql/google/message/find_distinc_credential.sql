SELECT
  distinct (google_credential)
FROM
  google_messages
WHERE
  thread_key = ANY($1::text[])