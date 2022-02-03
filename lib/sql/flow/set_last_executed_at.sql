UPDATE
  flows
SET
  last_step_date = $2
WHERE
  id = $1::uuid
