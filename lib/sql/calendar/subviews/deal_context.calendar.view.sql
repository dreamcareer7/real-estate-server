CREATE OR REPLACE VIEW calendar.deal_context AS (
  SELECT
    cdc.id::text,
    deals.created_by,
    cdc.created_at,
    cdc.created_at AS updated_at,
    cdc.deleted_at AS deleted_at,
    deals.deleted_at AS parent_deleted_at,
    GREATEST(cdc.created_at, cdc.deleted_at) AS last_updated_at,
    'deal_context' AS object_type,
    cdc."key" AS event_type,
    bc.label AS type_label,
    cdc."date" AS "timestamp",
    (timezone('UTC', date_trunc('day', cdc."date")) AT TIME ZONE 'UTC')::date AS "date",
    cdc."date" AS next_occurence,
    NULL::timestamptz AS end_date,
    False AS recurring,
    deals.title,
    NULL::uuid AS crm_task,
    TRUE as all_day,
    cdc.deal,
    NULL::uuid AS contact,
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
        r.deal = deals.id
        AND r.deleted_at IS NULL
        AND r."user" IS NOT NULL
    ) AS users,
    NULL::uuid[] AS accessible_to,
    NULL::json[] AS people,
    NULL::int AS people_len,
    COALESCE(dr.brand, deals.brand) AS brand,
    NULL::text AS status,
    NULL::jsonb AS metadata
  FROM
    current_deal_context cdc
    JOIN deals
      ON cdc.deal = deals.id
    JOIN brands_contexts bc
      ON bc.id = cdc.definition
    JOIN deals_checklists dcl
      ON dcl.id = cdc.checklist
    CROSS JOIN LATERAL (
      SELECT
        brand
      FROM
        deals_roles
      WHERE
        brand IS NOT NULL
        AND deleted_at IS NULL
        AND deals_roles.deal = deals.id

      UNION

      SELECT deals.brand
    ) dr
  WHERE
    deals.deleted_at IS NULL
    AND cdc.data_type = 'Date'::context_data_type
    AND dcl.deleted_at     IS NULL
    AND dcl.deactivated_at IS NULL
    AND dcl.terminated_at  IS NULL
    AND deals.faired_at    IS NOT NULL
    AND deal_status_mask(deals.id, '{Withdrawn,Cancelled,"Contract Terminated"}', cdc.key, '{expiration_date}'::text[], '{Sold,Leased}'::text[]) IS NOT FALSE
)