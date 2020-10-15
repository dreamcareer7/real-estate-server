INSERT INTO triggers (
  created_within,
  updated_within,

  created_by,
  "user",
  brand,

  event_type,
  wait_for,
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
  $7  /* "action" */,
  $8  /* recurring */,

  $9  /* contact */,
  $10 /* deal */,

  $11 /* flow */,
  $12 /* flow_step */,

  $13 /* brand_event */,
  $14 /* campaign */
)
RETURNING
  id
