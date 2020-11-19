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
VALUES (
  $1  /* created_within */,
  $1  /* updated_within */,

  $2  /* created_by */,
  $3  /* "user" */,
  $4  /* brand */,

  $5  /* event_type */,
  $6  /* wait_for */,
  $7  /* time */,
  $8  /* "action" */,
  $9  /* recurring */,

  $10  /* contact */,
  $11 /* deal */,

  $12 /* flow */,
  $13 /* flow_step */,

  $14 /* brand_event */,
  $15 /* campaign */
)
RETURNING
  id
