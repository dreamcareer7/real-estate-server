SELECT
  distinct (microsoft_credential)
FROM
  microsoft_messages
WHERE
  id = ANY($1::uuid[])