SELECT
  id,
  extract(epoch FROM created_at) AS created_at,
  extract(epoch FROM updated_at) AS updated_at,
  extract(epoch FROM deleted_at) AS deleted_at,
  extract(epoch FROM executed_at) AS executed_at,
  extract(epoch FROM effective_at) AS effective_at,
  extract(epoch FROM failed_at) AS failed_at,

  created_by,
  "user",
  brand,

  event_type,
  extract(epoch from wait_for) AS wait_for,
  "time",
  "action",
  recurring,
  failure,

  contact,
  deal,

  flow,
  flow_step,

  brand_event,
  event,
  campaign,

  scheduled_after,

  'trigger' AS type
FROM
  triggers
  JOIN unnest($1::uuid[]) WITH ORDINALITY t(tid, ord)
    ON triggers.id = t.tid
ORDER BY
  t.ord
