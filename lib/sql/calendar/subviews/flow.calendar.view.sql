CREATE OR REPLACE VIEW calendar.flow AS (
  SELECT
    id::text,
    created_by,
    created_at,
    updated_at,
    deleted_at,
    NULL::timestamptz AS parent_deleted_at,
    GREATEST(created_at, updated_at, deleted_at) AS last_updated_at,
    'flow' AS object_type,
    'last_step_date' AS event_type,
    'Last Step Date' AS type_label,
    last_step_date AS "timestamp",
    last_step_date::date AS "date",
    last_step_date as next_occurence,
    NULL::timestamptz AS end_date,
    False AS recurring,
    name::text AS title,
    NULL::uuid AS crm_task,
    TRUE AS all_day,
    NULL::uuid AS deal,
    contact,
    NULL::uuid AS campaign,
    NULL::uuid AS credential_id,
    NULL::text AS thread_key,
    NULL::uuid AS activity,
    id AS flow,
    ARRAY[created_by] AS users,
    NULL::uuid[] AS accessible_to,
    NULL::json[] AS people,
    0 AS people_len,
    brand,
    NULL::text AS status,
    NULL::jsonb AS metadata
  FROM
    flows
  WHERE
    flows.deleted_at IS NULL
)