SELECT
  id
FROM
  google_contacts
WHERE
  google_credential = $1
  AND resource_id ANY ($2::TEXT[])