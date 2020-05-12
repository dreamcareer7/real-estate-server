SELECT
  distinct (google_credential)
FROM
  google_messages
WHERE
  id = ANY($1::uuid[])