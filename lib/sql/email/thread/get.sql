SELECT
  email_threads.id,
  email_threads.created_at,
  email_threads.updated_at,
  email_threads.brand,
  email_threads."user",
  google_credential,
  microsoft_credential,
  email_threads.subject,
  first_message_date,
  last_message_date,
  recipients,
  message_count,

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
            WHEN google_credential IS NOT NULL THEN
              (SELECT
                jsonb_agg(jsonb_build_object('id', google_messages.id, 'type', 'google_message') ORDER BY message_date)
              FROM
                google_messages
              WHERE
                thread_key = email_threads.id
                AND google_messages.google_credential = email_threads.google_credential)
            WHEN microsoft_credential IS NOT NULL THEN
              (SELECT
                jsonb_agg(jsonb_build_object('id', microsoft_messages.id, 'type', 'microsoft_message') ORDER BY message_date)
              FROM
                microsoft_messages
              WHERE
                thread_key = email_threads.id
                AND microsoft_messages.microsoft_credential = email_threads.microsoft_credential)
            ELSE
              '[]'::jsonb
          END
        )
      )
    ELSE  
      NULL
    END
  ) AS messages
FROM
  email_threads
  JOIN unnest($1::text[]) WITH ORDINALITY t(eid, ord)
    ON email_threads.id = eid
  LEFT JOIN emails
    ON first_message_in_reply_to IS NOT NULL AND emails.mailgun_id = first_message_in_reply_to
ORDER BY
  t.ord
