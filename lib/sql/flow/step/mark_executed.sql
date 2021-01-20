UPDATE
  flows_steps
SET
  executed_at = NOW(),
  failed_at = NULL,
  updated_at = NOW(),
  crm_task = $2::uuid,
  campaign = $3::uuid
WHERE
  id = $1::uuid