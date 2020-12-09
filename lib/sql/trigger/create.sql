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

  contact,
  deal,

  flow,
  flow_step,

  brand_event,
  campaign
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

  contact,
  deal,

  flow,
  flow_step,

  brand_event,
  campaign
FROM
  json_populate_recordset(null::triggers, $2::json)
RETURNING
  id
