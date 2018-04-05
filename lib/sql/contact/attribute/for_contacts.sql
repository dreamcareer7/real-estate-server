SELECT
  id
FROM
  contacts_attributes_with_name
WHERE
  contact = ANY($1::uuid[])
ORDER BY contact, created_at