CREATE OR REPLACE VIEW calendar.email_campaign_email_executed AS (
  SELECT
    ec.id::text,
    ec.created_by,
    ec.created_at,
    ec.updated_at,
    ec.deleted_at,
    NULL::timestamptz AS parent_deleted_at,
    GREATEST(ec.created_at, ec.updated_at, ec.deleted_at) AS last_updated_at,
    'email_campaign_recipient' AS object_type,
    'executed_email' AS event_type,
    'Executed Email' AS type_label,
    executed_at AS "timestamp",
    executed_at::date AS "date",
    executed_at AS next_occurence,
    NULL::timestamptz AS end_date,
    False AS recurring,
    subject AS title,
    NULL::uuid AS crm_task,
    FALSE as all_day,
    ec.deal,
    c.id AS contact,
    ec.id AS campaign,
    NULL::uuid AS credential_id,
    NULL::text AS thread_key,
    NULL::uuid AS activity,
    NULL::uuid AS flow,
    ARRAY[ec.from] AS users,
    NULL::uuid[] AS accessible_to,

    (
      SELECT
        ARRAY_AGG(json_build_object(
          'id', COALESCE(contact, agent),
          'type', (CASE WHEN contact IS NOT NULL THEN 'contact' ELSE 'agent' END)
        ))
      FROM
        (
          SELECT
            contacts.id AS contact,
            email_campaign_emails.agent
          FROM
            email_campaign_emails
            LEFT JOIN contacts
              ON ((LOWER(contacts.email::text)::text[] @> ARRAY[LOWER(email_campaign_emails.email_address)]) OR (contacts.id = email_campaign_emails.contact))
                  AND contacts.brand = ec.brand
                  AND contacts.deleted_at IS NULL
                  AND contacts.parked IS NOT TRUE
          WHERE
            email_campaign_emails.campaign = ec.id
            AND (email_campaign_emails.agent IS NOT NULL OR contacts.id IS NOT NULL)
          LIMIT 5
        ) t
    ) AS people,

    (
      SELECT
        count(*)::int
      FROM
        email_campaign_emails
      WHERE
        email_campaign_emails.campaign = ec.id
    ) AS people_len,

    ec.brand,
    NULL::text AS status,
    NULL::jsonb AS metadata
  FROM
    email_campaigns AS ec
    JOIN email_campaign_emails AS ece
      ON ece.campaign = ec.id
    JOIN contacts c
      ON (c.brand = ec.brand AND ec.id = ece.campaign)
  WHERE
    ec.deleted_at IS NULL
    AND c.deleted_at IS NULL
    AND c.parked IS NOT TRUE
    AND LOWER(c.email::text)::text[] @> ARRAY[LOWER(ece.email_address)]
    AND ec.executed_at IS NOT NULL
    AND ec.thread_key IS NULL
)