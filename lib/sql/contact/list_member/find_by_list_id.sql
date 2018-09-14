SELECT
  contact AS id
FROM
  contact_lists_members
WHERE
  list = ANY($1::uuid[])
