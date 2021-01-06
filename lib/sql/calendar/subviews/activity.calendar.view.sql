CREATE OR REPLACE VIEW calendar.activity AS (
  SELECT
    a.id::text,
    a.created_by,
    a.created_at,
    a.updated_at,
    a.deleted_at,
    NULL::timestamptz AS parent_deleted_at,
    GREATEST(a.created_at, a.updated_at, a.deleted_at) AS last_updated_at,
    'activity' AS object_type,
    "action"::text AS event_type,
    "action"::text AS type_label,
    a.created_at AS "timestamp",
    (timezone('UTC', date_trunc('day', a.created_at)::timestamp) AT TIME ZONE 'UTC')::date AS "date",
    cast(a.created_at + ((extract(year from age(a.created_at)) + 1) * interval '1' year) as date) as next_occurence,
    NULL::timestamptz AS end_date,
    False AS recurring,
    "action"::text AS title,
    NULL::uuid AS crm_task,
    FALSE as all_day,
    NULL::uuid AS deal,
    contact,
    NULL::uuid AS campaign,
    NULL::uuid AS credential_id,
    NULL::text AS thread_key,
    a.id AS activity,
    NULL::uuid AS flow,
    ARRAY[contacts."user"] AS users,
    NULL::uuid[] AS accessible_to,
    ARRAY[json_build_object('id', contact, 'type', 'contact')]::json[] AS people,
    1 AS people_len,
    contacts.brand,
    NULL::text AS status,
    NULL::jsonb AS metadata
  FROM
    contacts
    JOIN contacts_users AS cu
      ON contacts.id = cu.contact
    JOIN users AS u
      ON cu."user" = u.id
    JOIN activities AS a
      ON a.reference = u.id AND a.reference_type = 'User'
  WHERE
    contacts.deleted_at IS NULL
    AND contacts.parked IS NOT TRUE
    AND u.is_shadow IS NOT TRUE
    AND u.deleted_at IS NULL
    AND u.user_type = 'Client'
    AND a.deleted_at IS NULL
)