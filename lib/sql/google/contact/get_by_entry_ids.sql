SELECT
  id
FROM
  google_contacts
WHERE
  google_credential = $1
  AND entry_id ANY ($2::TEXT[])