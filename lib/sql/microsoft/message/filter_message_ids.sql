SELECT
  id
FROM
  microsoft_messages
WHERE
  microsoft_credential = $1
  AND id = ANY($2::uuid[])