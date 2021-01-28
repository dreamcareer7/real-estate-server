SELECT
  id
FROM
  microsoft_contacts
WHERE
  microsoft_credential = $1
  AND remote_id = ANY ($2::TEXT[])