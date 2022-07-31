CREATE OR REPLACE VIEW crm_last_touches AS (
  SELECT DISTINCT ON (contact)
    contact,
    max(timestamp) OVER (PARTITION BY contact) AS last_touch,
    action,
    reference
  FROM
    (
      (
        SELECT
          ca.contact,
          ct.due_date AS "timestamp",
          ct.task_type AS action,
          ct.id AS reference
        FROM
          crm_associations AS ca
          JOIN crm_tasks AS ct
            ON ca.crm_task = ct.id
        WHERE
          ca.deleted_at IS NULL
          AND ct.deleted_at IS NULL
          AND ct.task_type <> ALL('{Note,Other}')
          AND ct.due_date <= NOW()
          -- There is an index call crm_tasks_last_touches made for this query.
          -- If you make changes to this query, please make sure you update the index.
          -- The index makes this query to index-only. Otherwise it'd be extremely expensive.
      ) UNION ALL (
        SELECT
          c.id,
          message_date AS "timestamp",
          'email' AS action,
          google_messages.id AS reference
        FROM
          google_messages
          JOIN google_credentials
            ON google_messages.google_credential = google_credentials.id
          CROSS JOIN LATERAL (
            SELECT
              contacts.id
            FROM
              contacts
            WHERE
              contacts.email && google_messages.recipients
              AND contacts.brand = google_credentials.brand
              AND contacts.deleted_at IS NULL
              AND google_messages.deleted_at IS NULL
          ) AS c
        WHERE
          google_credentials.deleted_at IS NULL
          AND google_credentials.revoked IS NOT TRUE
      ) UNION ALL (
        SELECT
          c.id,
          message_date AS "timestamp",
          'email' AS action,
          microsoft_messages.id AS reference
        FROM
          microsoft_messages
          JOIN microsoft_credentials
            ON microsoft_messages.microsoft_credential = microsoft_credentials.id
          CROSS JOIN LATERAL (
            SELECT
              contacts.id
            FROM
              contacts
            WHERE
              contacts.email && microsoft_messages.recipients
              AND contacts.brand = microsoft_credentials.brand
              AND contacts.deleted_at IS NULL
              AND microsoft_messages.deleted_at IS NULL
          ) AS c
        WHERE
          microsoft_credentials.deleted_at IS NULL
          AND microsoft_credentials.revoked IS NOT TRUE
      ) UNION ALL (
        SELECT
          c.id AS contact,
          executed_at AS "timestamp",
          'email' AS action,
          ec.id AS reference
        FROM
          email_campaigns AS ec
          JOIN email_campaign_emails AS ece
            ON ece.campaign = ec.id
          JOIN contacts c
            ON (c.brand = ec.brand)
        WHERE
          ec.deleted_at IS NULL
          AND c.deleted_at IS NULL
          AND ece.email_address = ANY(c.email)
          AND ec.executed_at IS NOT NULL
      )
    ) AS touches
  ORDER BY
    contact,
    "timestamp" DESC
)
