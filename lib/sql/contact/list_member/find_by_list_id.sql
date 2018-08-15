SELECT
  contact AS id
FROM
  contact_lists_members
WHERE
  list = $1::uuid