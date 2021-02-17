DELETE FROM
  contact_integration
WHERE
  id = ANY($1::uuid[])