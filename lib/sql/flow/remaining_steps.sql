WITH steps_with_ts AS (
  (
    SELECT
      fs.id,
      fs.origin,
      crm_tasks.due_date AS "timestamp"
    FROM
      flows_steps AS fs
      JOIN flows_events AS fe
        ON fs.event = fe.id
      JOIN crm_tasks
        ON fe.crm_task = crm_tasks.id
    WHERE
      fs.deleted_at IS NULL
      AND fe.deleted_at IS NULL
      AND crm_tasks.deleted_at IS NULL
      AND fs.flow = $1::uuid
  ) UNION ALL (
    SELECT
      fs.id,
      fs.origin,
      ec.due_at AS "timestamp"
    FROM
      flows_steps AS fs
      JOIN flows_emails AS fe
        ON fs.email = fe.id
      JOIN email_campaigns AS ec
        ON fe.email = ec.id
    WHERE
      fs.deleted_at IS NULL
      AND fe.deleted_at IS NULL
      AND ec.deleted_at IS NULL
      AND ec.executed_at IS NULL
      AND fs.flow = $1::uuid
  )
)
SELECT
  *
FROM
  steps_with_ts
WHERE
  "timestamp" > NOW()
ORDER BY
  "timestamp"
