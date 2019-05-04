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
  (SELECT flows_emails.email FROM flows_emails WHERE flows_emails.id = flows_steps.email LIMIT 1) AS email,
  (SELECT flows_events.crm_task FROM flows_events WHERE flows_events.id = flows_steps.event LIMIT 1) AS crm_task,

  'flow_step' AS type
FROM
  flows_steps
  JOIN unnest($1::uuid[]) WITH ORDINALITY t(cid, ord) ON flows_steps.id = t.cid
ORDER BY
  t.ord
