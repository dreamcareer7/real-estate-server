EXPLAIN ANALYZE SELECT
  thread_heads.id,
  thread_heads.user AS created_by,
  'email_thread' AS object_type,
  'gmail' AS event_type,
  'Email Thread' AS type_label,
  message_date AS "timestamp",
  message_date AS "date",
  message_date AS next_occurence,
  NULL AS end_date,
  False AS recurring,
  COALESCE(subject, '') AS "title",
  NULL::uuid AS crm_task,
  NULL::uuid AS deal,
  NULL::uuid AS contact,
  NULL::uuid AS campaign,
  thread_heads.credential_id,
  thread_heads.thread_key,
  ARRAY[thread_heads.user] AS users,

  ARRAY(SELECT DISTINCT unnest(thread_heads.people)) AS people,

  thread_heads.brand,
  NULL::text AS status,
  NULL::jsonb AS metadata
FROM
  (
    SELECT
      DISTINCT ON (google_credentials.brand, thread_key)
      google_messages.id,
      google_messages.google_credential AS credential_id,
      thread_key,

      ARRAY_AGG(contacts.id) OVER (PARTITION BY google_credentials.brand, thread_key) AS people,

      google_credentials.user,
      google_credentials.brand
    FROM
      google_messages
      JOIN google_credentials
        ON google_messages.google_credential = google_credentials.id
      JOIN contacts
        ON ((contacts.brand = google_credentials.brand) AND (contacts.email && google_messages.recipients))
      -- CROSS JOIN LATERAL unnest(recipients) AS rcp(email)
    WHERE
      google_messages.deleted_at IS NULL
    ORDER BY
      google_credentials.brand,
      thread_key,
      message_date ASC
  ) AS thread_heads
  JOIN google_messages
    ON thread_heads.id = google_messages.id
WHERE
  -- thread_heads.thread_key = '2a5e3d92-46a7-4fa7-b66f-6b8162f0b65e166166045af1e99f'
  thread_heads.brand = 'ee99d0f0-f179-11e9-803d-0a653b6fef3e'
LIMIT 10;
-- SELECT
--   DISTINCT ON (google_credentials.brand, thread_key)
--   google_messages.id,
--   google_messages.google_credential AS credential_id,
--   thread_key,

--   ARRAY_AGG(contacts.id) OVER (PARTITION BY thread_key) AS people,
  
--   google_credentials.brand
-- FROM
--   google_messages
--   JOIN google_credentials
--     ON google_messages.google_credential = google_credentials.id
--   JOIN contacts
--     ON ((contacts.brand = google_credentials.brand) AND (contacts.email && google_messages.recipients))
--   -- CROSS JOIN LATERAL unnest(recipients) AS rcp(email)
-- WHERE
--   google_messages.deleted_at IS NULL
--   AND google_messages.thread_key = '2a5e3d92-46a7-4fa7-b66f-6b8162f0b65e166166045af1e99f'
-- ORDER BY
--   google_credentials.brand,
--   thread_key,
--   message_date ASC
