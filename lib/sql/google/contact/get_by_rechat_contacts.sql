SELECT
  id
FROM
  google_contacts
WHERE
  google_credential = $1
  AND contact = ANY ($2::UUID[])