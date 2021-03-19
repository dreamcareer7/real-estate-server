CREATE OR REPLACE VIEW calendar.email_campaign_scheduled AS (
  SELECT
    id::text,
    ec.created_by,
    ec.created_at,
    ec.updated_at,
    ec.deleted_at,
    NULL::timestamptz AS parent_deleted_at,
    GREATEST(ec.created_at, ec.updated_at, ec.deleted_at) AS last_updated_at,
    'email_campaign' AS object_type,
    'scheduled_email' AS event_type,
    'Scheduled Email' AS type_label,
    due_at AS "timestamp",
    due_at::date AS "date",
    due_at AS next_occurence,
    NULL::timestamptz AS end_date,
    False AS recurring,
    subject AS title,
    NULL::uuid AS crm_task,
    FALSE as all_day,
    ec.deal,
    NULL::uuid AS contact,
    id AS campaign,
    NULL::uuid AS credential_id,
    NULL::text AS thread_key,
    NULL::uuid AS activity,
    NULL::uuid AS showing,
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
            contact,
            agent
          FROM
            email_campaigns_recipient_emails AS ecr
          WHERE
            campaign = ec.id
          LIMIT 5
        ) t
    ) AS people,

    (
      SELECT
        COUNT(DISTINCT email)::int
      FROM
        email_campaigns_recipient_emails AS ecr
      WHERE
        campaign = ec.id
    ) AS people_len,

    brand,
    NULL::text AS status,
    NULL::jsonb AS metadata
  FROM
    email_campaigns AS ec
  WHERE
    deleted_at IS NULL
    AND executed_at IS NULL
    AND due_at IS NOT NULL
)
