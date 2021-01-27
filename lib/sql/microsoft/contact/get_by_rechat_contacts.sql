SELECT
  id
FROM
  microsoft_contacts
WHERE
  microsoft_credential = $1
  AND contact = ANY ($2::UUID[])