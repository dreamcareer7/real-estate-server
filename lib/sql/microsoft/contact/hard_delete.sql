DELETE FROM
  microsoft_contacts
WHERE
  id = ANY($1::uuid[])