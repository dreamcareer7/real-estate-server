SELECT DISTINCT
  list AS id
FROM
  contact_lists_members
WHERE
  contact = ANY($1::uuid[])