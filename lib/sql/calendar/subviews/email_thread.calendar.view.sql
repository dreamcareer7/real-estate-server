CREATE OR REPLACE VIEW calendar.email_thread AS (
  SELECT
    email_threads.id::text,
    email_threads.user AS created_by,
    email_threads.created_at,
    email_threads.updated_at,
    email_threads.deleted_at,
    NULL::timestamptz AS parent_deleted_at,
    GREATEST(created_at, updated_at, deleted_at) AS last_updated_at,
    'email_thread' AS object_type,
    (CASE WHEN google_credential IS NOT NULL THEN 'gmail' ELSE 'outlook' END) AS event_type,
    'Email Thread' AS type_label,
    last_message_date AS "timestamp",
    last_message_date::date AS "date",
    last_message_date AS next_occurence,
    NULL::timestamptz AS end_date,
    False AS recurring,
    COALESCE(subject, '(no subject)') AS "title",
    NULL::uuid AS crm_task,
    FALSE as all_day,
    NULL::uuid AS deal,
    NULL::uuid AS contact,
    NULL::uuid AS campaign,
    COALESCE(google_credential, microsoft_credential) AS credential_id,
    email_threads.id AS thread_key,
    NULL::uuid AS activity,
    NULL::uuid AS flow,
    ARRAY[email_threads."user"] AS users,
    ARRAY[email_threads."user"] AS accessible_to,

    (
      SELECT
        ARRAY_AGG(json_build_object(
          'id', contact,
          'type', 'contact'
        ))
      FROM
        (
          SELECT
            contacts.id AS contact
          FROM
            contacts
          WHERE
            contacts.brand = email_threads.brand
            AND contacts.email && recipients
            AND contacts.deleted_at IS NULL
            AND contacts.parked IS NOT TRUE
          LIMIT 5
        ) t
    ) AS people,

    (
      SELECT
        count(DISTINCT contacts.id)::int
      FROM
        contacts
      WHERE
        contacts.brand = email_threads.brand
        AND contacts.email && recipients
        AND contacts.deleted_at IS NULL
        AND contacts.parked IS NOT TRUE
    ) AS people_len,

    email_threads.brand,
    NULL::text AS status,
    NULL::jsonb AS metadata
  FROM
    email_threads
  WHERE
    email_threads.deleted_at IS NULL
)