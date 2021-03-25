CREATE OR REPLACE VIEW calendar.contact AS (
  SELECT
    id::text,
    created_by,
    created_at,
    updated_at,
    deleted_at,
    NULL::timestamptz AS parent_deleted_at,
    GREATEST(created_at, updated_at, deleted_at) AS last_updated_at,
    'contact' AS object_type,
    'next_touch' AS event_type,
    'Next Touch' AS type_label,
    next_touch AS "timestamp",
    next_touch::date AS "date",
    next_touch AS next_occurence,
    NULL::timestamptz AS end_date,
    False AS recurring,
    'Touch reminder: ' || display_name AS title,
    NULL::uuid AS crm_task,
    TRUE as all_day,
    NULL::uuid AS deal,
    id AS contact,
    NULL::uuid AS campaign,
    NULL::uuid AS credential_id,
    NULL::text AS thread_key,
    NULL::uuid AS activity,
    NULL::uuid AS showing,
    NULL::uuid AS flow,
    ARRAY[contacts."user"] AS users,
    NULL::uuid[] AS accessible_to,
    ARRAY[json_build_object('id', id, 'type', 'contact')]::json[] AS people,
    1 AS people_len,
    brand,
    NULL::text AS status,
    NULL::jsonb AS metadata
  FROM
    contacts
  WHERE
    deleted_at IS NULL
    AND next_touch IS NOT NULL
    AND parked IS NOT TRUE
)
