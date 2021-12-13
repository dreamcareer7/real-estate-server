SELECT
  email_threads.id,
  extract(epoch from email_threads.created_at) AS created_at,
  extract(epoch from email_threads.updated_at) AS updated_at,
  email_threads.brand,
  email_threads."user",
  email_threads.google_credential,
  email_threads.microsoft_credential,
  email_threads.subject,
  extract(epoch from first_message_date) AS first_message_date,
  extract(epoch from last_message_date) AS last_message_date,
  recipients,
  recipients_raw,
  senders_raw,
  message_count,
  has_attachments,
  is_read,
  last_message_id,

  (
    CASE
      WHEN $2::text[] && '{"email_thread.messages"}'::text[] THEN (
        (
          CASE
            WHEN emails.id IS NOT NULL THEN
              jsonb_build_array(
                jsonb_build_object(
                  'id', emails.id,
                  'type', 'email'
                )
              )
            ELSE
              '[]'::jsonb
          END
        ) || (
          CASE
            WHEN email_threads.google_credential IS NOT NULL THEN
              (SELECT
                jsonb_agg(jsonb_build_object('id', google_messages.id, 'type', 'google_message') ORDER BY message_date)
              FROM
                google_messages
              WHERE
                thread_key = email_threads.id
                AND google_messages.google_credential = email_threads.google_credential
                AND google_messages.deleted_at IS NULL)
            WHEN email_threads.microsoft_credential IS NOT NULL THEN
              (SELECT
                jsonb_agg(jsonb_build_object('id', microsoft_messages.id, 'type', 'microsoft_message') ORDER BY message_date)
              FROM
                microsoft_messages
              WHERE
                thread_key = email_threads.id
                AND microsoft_messages.microsoft_credential = email_threads.microsoft_credential
                AND microsoft_messages.deleted_at IS NULL)
            ELSE
              '[]'::jsonb
          END
        )
      )
    ELSE  
      NULL
    END
  ) AS messages,
  (
    CASE
      WHEN $2::text[] && '{"email_thread.contacts"}'::text[] THEN (
        SELECT
          array_agg(id)
        FROM
          contacts AS c
        WHERE
          c.deleted_at IS NULL
          AND c.brand = email_threads.brand
          AND c.email && email_threads.recipients
      )
      ELSE NULL
    END
  ) AS contacts,
  'email_thread' AS "type"
FROM
  email_threads
  JOIN unnest($1::text[]) WITH ORDINALITY t(eid, ord)
    ON email_threads.id = eid
  LEFT JOIN emails
    ON first_message_in_reply_to IS NOT NULL AND emails.mailgun_id = first_message_in_reply_to
ORDER BY
  t.ord
