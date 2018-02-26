DELETE FROM
  crm_associations
WHERE
  id = $1
  AND $2 = $3;