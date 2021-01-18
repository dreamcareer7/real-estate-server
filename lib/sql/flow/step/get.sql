SELECT
  id,
  extract(epoch FROM created_at) AS created_at,
  extract(epoch FROM updated_at) AS updated_at,
  extract(epoch FROM deleted_at) AS deleted_at,
  created_by,
  updated_by,
  deleted_by,
  flow,
  origin,
  campaign,
  crm_task,
  extract(epoch FROM executed_at) AS executed_at,
  extract(epoch FROM failed_at) AS failed_at,
  failure,

  'flow_step' AS type
FROM
  flows_steps
  JOIN unnest($1::uuid[]) WITH ORDINALITY t(cid, ord) ON flows_steps.id = t.cid
ORDER BY
  t.ord
