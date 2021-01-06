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
    'flow_start' AS event_type,
    'Flow Start' AS type_label,
    starts_at::timestamptz AS "timestamp",
    starts_at::date AS "date",
    starts_at as next_occurence,
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