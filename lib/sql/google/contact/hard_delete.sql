DELETE FROM
  google_contacts
WHERE
  id = ANY($1::uuid[])