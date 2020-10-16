SELECT
  *
FROM
  triggers_due
WHERE
  id = $1::uuid
