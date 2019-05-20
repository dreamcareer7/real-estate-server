WITH u_steps AS (
  UPDATE
    flows_steps
  SET
    deleted_at = NOW(),
    deleted_by = $2::uuid
  WHERE
    flows_steps.id = ANY($1::uuid[])
    AND deleted_at IS NULL
  RETURNING
    flows_steps.id, email, event
),
u_emails AS (
  UPDATE
    flows_emails AS fe
  SET
    deleted_at = NOW(),
    deleted_by = $2::uuid
  FROM
    u_steps
  WHERE
    u_steps.email IS NOT NULL
    AND fe.id = u_steps.email
  RETURNING
    fe.id, fe.email
),
u_events AS (
  UPDATE
    flows_events AS fe
  SET
    deleted_at = NOW(),
    deleted_by = $2::uuid
  FROM
    u_steps
  WHERE
    u_steps.event IS NOT NULL
    AND fe.id = u_steps.event
  RETURNING
    fe.id, crm_task
)
SELECT
  u_emails.email,
  u_events.crm_task
FROM
  u_steps
  LEFT JOIN u_emails
    ON u_steps.email = u_emails.id
  LEFT JOIN u_events
    ON u_steps.event = u_events.id
