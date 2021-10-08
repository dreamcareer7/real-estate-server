INSERT INTO triggers (
  created_within,
  updated_within,

  created_by,
  "user",
  brand,

  event_type,
  wait_for,
  "time",
  "action",
  recurring,
  effective_at,

  contact,
  deal,

  flow,
  flow_step,

  brand_event,
  campaign,

  scheduled_after,

  is_global
)
SELECT
  $1,
  $1,

  created_by,
  "user",
  brand,

  event_type,
  wait_for,
  "time",
  "action",
  COALESCE(recurring, FALSE) AS recurring,
  COALESCE(effective_at, NOW()) AS effective_at,

  contact,
  deal,

  flow,
  flow_step,

  brand_event,
  campaign,

  scheduled_after,

  is_global
FROM
  json_populate_recordset(null::triggers, $2::json)
RETURNING
  id
