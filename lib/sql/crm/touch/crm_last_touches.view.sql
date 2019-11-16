CREATE OR REPLACE VIEW crm_last_touches AS (
  SELECT
    contact,
    MAX(timestamp) AS last_touch
  FROM
    (
      (
        SELECT
          ca.contact,
          ct.due_date AS "timestamp"
        FROM
          crm_associations AS ca
          JOIN crm_tasks AS ct
            ON ca.crm_task = ct.id
        WHERE
          ca.deleted_at IS NULL
          AND ct.deleted_at IS NULL
          AND ct.task_type <> ALL('{Note,Other}')
          AND ct.due_date <= NOW()
      ) UNION ALL (
        SELECT
          c.id,
          last_message_date AS "timestamp"
        FROM
          microsoft_threads
          JOIN microsoft_credentials
            ON microsoft_threads.microsoft_credential = microsoft_credentials.id
          CROSS JOIN LATERAL (
            SELECT
              contacts.id
            FROM
              contacts
            WHERE
              contacts.email && microsoft_threads.recipients
              AND contacts.brand = microsoft_credentials.brand
          ) AS c
      ) UNION ALL (
        SELECT
          c.id,
          last_message_date AS "timestamp"
        FROM
          google_threads
          JOIN google_credentials
            ON google_threads.google_credential = google_credentials.id
          CROSS JOIN LATERAL (
            SELECT
              contacts.id
            FROM
              contacts
            WHERE
              contacts.email && google_threads.recipients
              AND contacts.brand = google_credentials.brand
          ) AS c
      ) UNION ALL (
        SELECT
          c.id AS contact,
          executed_at AS "timestamp"
        FROM
          email_campaigns AS ec
          JOIN email_campaign_emails AS ece
            ON ece.campaign = ec.id
          JOIN contacts c
            ON (c.brand = ec.brand)
        WHERE
          ec.deleted_at IS NULL
          AND c.deleted_at IS NULL
          AND c.email && ARRAY[ece.email_address]
          AND ec.executed_at IS NOT NULL
      )
    ) AS touches
  GROUP BY
    contact
)
