SELECT DISTINCT
  list AS id
FROM
  crm_lists_members
WHERE
  contact = ANY($1::uuid[])
