UPDATE
  flows
SET
  last_step_date = NOW()
WHERE
  id = $1::uuid
