SELECT
  id
FROM
  google_messages
WHERE
  google_credential = $1
  AND id = ANY($2::uuid[])