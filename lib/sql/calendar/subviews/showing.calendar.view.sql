CREATE OR REPLACE VIEW calendar.showing AS (
  SELECT
    a.id::text,
    s.created_by,
    a.created_at,
    a.updated_at,
    (CASE WHEN a.status = 'Cancelled' THEN a.updated_at ELSE NULL END) AS deleted_at,
    s.deleted_at AS parent_deleted_at,
    GREATEST(a.created_at, a.updated_at) AS last_updated_at,
    'showing_appointment' AS object_type,
    'due_date' AS event_type,
    'Showing' AS type_label,
    time AS "timestamp",
    time::date AS "date",
    time as next_occurence,
    (a.time + s.duration) AS end_date,
    False AS recurring,
    NULL::text AS title,
    NULL::uuid AS crm_task,
    FALSE AS all_day,
    s.deal,
    a.contact,
    NULL::uuid AS campaign,
    NULL::uuid AS credential_id,
    NULL::text AS thread_key,
    NULL::uuid AS activity,
    s.id AS showing,
    NULL::uuid AS flow,
    (
      SELECT
        ARRAY_AGG(DISTINCT r."user")
      FROM
        showings_roles AS r
      WHERE
        r.showing = s.id
        AND r.deleted_at IS NULL
        AND r."user" IS NOT NULL
    ) AS users,
    NULL::uuid[] AS accessible_to,
    ARRAY[json_build_object(
      'id', a.contact,
      'type', 'contact'
    )] AS people,
    1 AS people_len,
    sr.brand,
    a.status::text AS status,
    NULL::jsonb AS metadata
  FROM
    showings AS s
    JOIN showings_appointments AS a
      ON a.showing = s.id
    CROSS JOIN LATERAL (
      (SELECT DISTINCT
        brand
      FROM
        showings_roles
      WHERE
        brand IS NOT NULL
        AND deleted_at IS NULL
        AND showings_roles.showing = s.id)

      UNION

      (SELECT s.brand)
    ) AS sr
  WHERE
    a.status = 'Pending'::showing_appointment_status
)
