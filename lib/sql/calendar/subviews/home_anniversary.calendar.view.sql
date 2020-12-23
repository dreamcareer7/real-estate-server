CREATE OR REPLACE VIEW calendar.home_anniversary AS (
  SELECT
    c.id::text || ':' || cdc.id::text AS id,
    cdc.created_by,
    cdc.created_at,
    cdc.created_at AS updated_at,
    cdc.deleted_at,
    NULL::timestamptz AS parent_deleted_at,
    GREATEST(cdc.created_at, cdc.deleted_at) AS last_updated_at,
    'deal_context' AS object_type,
    'home_anniversary' AS event_type,
    'Home Anniversary' AS type_label,
    cdc."date" AS "timestamp",
    (timezone('UTC', date_trunc('day', cdc."date")) AT TIME ZONE 'UTC')::date AS "date",
    cast(cdc."date" + ((extract(year from age(cdc."date")) + 1) * interval '1 year') as date) AS next_occurence,
    NULL::timestamptz AS end_date,
    TRUE AS recurring,
    cdc.title,
    NULL::uuid AS crm_task,
    TRUE as all_day,
    cdc.deal,
    c.id AS contact,
    NULL::uuid AS campaign,
    NULL::uuid AS credential_id,
    NULL::text AS thread_key,
    NULL::uuid AS activity,
    NULL::uuid AS flow,
    (
      SELECT
        ARRAY_AGG(DISTINCT r."user")
      FROM
        deals_roles AS r
      WHERE
        r.deal = cdc.deal
        AND r.deleted_at IS NULL
        AND r."user" IS NOT NULL
    ) AS users,
    NULL::uuid[] AS accessible_to,
    ARRAY[json_build_object(
      'id', c.id,
      'type', 'contact'
    )] AS people,
    1 AS people_len,
    cdc.brand,
    NULL::text AS status,
    NULL::jsonb AS metadata
  FROM
    contacts AS c
    JOIN calendar.deals_closed_buyers AS cdc
      ON ((cdc.email = ANY(c.email)) OR (cdc.phone_number = ANY(c.phone_number)))
  WHERE
    c.deleted_at IS NULL
    AND c.brand = cdc.brand
)
