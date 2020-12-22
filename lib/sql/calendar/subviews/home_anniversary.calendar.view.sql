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
    d.title,
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
        r.deal = d.deal
        AND r.deleted_at IS NULL
        AND r."user" IS NOT NULL
    ) AS users,
    NULL::uuid[] AS accessible_to,
    (
      SELECT
        ARRAY_AGG(json_build_object(
          'id', contact,
          'type', 'contact'
        ))
      FROM
        contacts_roles
      WHERE
        role_name = 'Buyer'
        AND deal = d.deal
    ) AS people,
    NULL::int AS people_len,
    d.brand,
    NULL::text AS status,
    NULL::jsonb AS metadata
  FROM
    current_deal_context cdc
    -- JOIN brands_contexts bc
    --   ON bc.id = cdc.definition
    -- JOIN brands_checklists bcl
    --   ON dcl.origin = bcl.id
    JOIN calendar.deals_buyers AS d
      ON cdc.deal = d.deal
    JOIN contacts AS c
      ON ((d.email = ANY(c.email)) OR (d.phone_number = ANY(c.phone_number)))
  WHERE
    (
      (cdc.key = 'closing_date' AND cdc.date < NOW())
      OR cdc.key = 'lease_end'
    )
    -- AND bcl.deal_type = 'Buying'
    -- AND bcl.deleted_at     Is NULL
    AND deal_status_mask(d.deal, '{Withdrawn,Cancelled,"Contract Terminated"}', cdc.key, '{expiration_date}'::text[], '{Sold,Leased}'::text[]) IS NOT FALSE
    AND c.deleted_at IS NULL
    AND c.brand = d.brand
)
