CREATE OR REPLACE VIEW calendar.email_campaign_executed AS (
  SELECT
    ec.id::text,
    ec.created_by,
    ec.created_at,
    ec.updated_at,
    ec.deleted_at,
    NULL::timestamptz AS parent_deleted_at,
    GREATEST(ec.created_at, ec.updated_at, ec.deleted_at) AS last_updated_at,
    'email_campaign' AS object_type,
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
    NULL::uuid AS contact,
    id AS campaign,
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
            c.id AS contact,
            ece.agent
          FROM
            email_campaign_emails AS ece
            LEFT JOIN contacts AS c
              ON (((c.id = ece.contact) OR (LOWER(c.email::text)::text[] @> ARRAY[LOWER(ece.email_address)])) AND c.brand = ec.brand AND c.deleted_at IS NULL)
          WHERE
            ece.campaign = ec.id
            AND (ece.agent IS NOT NULL OR c.id IS NOT NULL)
            AND c.parked IS NOT TRUE
          LIMIT 5
        ) t
    ) AS people,

    (
      SELECT
        count(*)::int
      FROM
        email_campaign_emails AS ece
      WHERE
        ece.campaign = ec.id
    ) AS people_len,

    brand,
    NULL::text AS status,
    NULL::jsonb AS metadata
  FROM
    email_campaigns AS ec
  WHERE
    deleted_at IS NULL
    AND executed_at IS NOT NULL
    AND due_at IS NOT NULL
    AND thread_key IS NULL
)