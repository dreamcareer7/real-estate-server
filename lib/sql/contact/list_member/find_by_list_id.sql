SELECT
  contact AS id
FROM
  crm_lists_members
WHERE
  list = ANY($1::uuid[])
