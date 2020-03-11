INSERT INTO email_threads (
  id,
  google_credential,
  "user",
  brand,
  "subject",
  last_message_id,
  first_message_in_reply_to,
  first_message_date,
  last_message_date,
  recipients,
  recipients_raw,
  message_count,
  has_attachments,
  is_read
)
(
  WITH thread_recipients AS (
    SELECT
      thread_key, array_agg(DISTINCT recipient) AS recipients
    FROM
      google_messages, unnest(recipients) AS t(recipient)
    WHERE
      google_messages.thread_key = ANY($1::text[])
      AND google_messages.deleted_at IS NULL
    GROUP BY
      thread_key
  ), distinct_recipients_raw AS (
    SELECT DISTINCT ON (thread_key, address)
      thread_key, name, address
    FROM
      google_messages,
      jsonb_to_recordset(to_raw || from_raw) AS recipients_raw(name text, address text)
    WHERE
      google_messages.thread_key = ANY($1::text[])
      AND google_messages.deleted_at IS NULL
    ORDER BY
      thread_key, address
  ), thread_recipients_raw AS (
    SELECT
      thread_key, jsonb_agg(jsonb_build_object(
        'name', name,
        'address', address
      )) AS recipients_raw
    FROM
      distinct_recipients_raw
    GROUP BY
      thread_key
  )
  SELECT DISTINCT ON (google_messages.thread_key)
    google_messages.thread_key,
    google_credential,
    google_credentials."user",
    google_credentials.brand,
    last_value(subject) OVER (w ORDER BY message_date) AS "subject",
    last_value(message_id) OVER (w ORDER BY message_date) AS last_message_id,
    first_value(google_messages.in_reply_to) OVER (w ORDER BY message_date) AS first_message_in_reply_to,
    min(message_date) OVER (w) AS first_message_date,
    max(message_date) OVER (w) AS last_message_date,
    thread_recipients.recipients,
    thread_recipients_raw.recipients_raw,
    count(*) OVER (w) AS message_count,
    SUM(has_attachments::int) OVER (w) > 0 AS has_attachments,
    AVG(is_read::int) OVER (w) = 1 AS is_read
  FROM
    google_messages
    JOIN google_credentials
      ON google_messages.google_credential = google_credentials.id
    JOIN thread_recipients
      ON google_messages.thread_key = thread_recipients.thread_key
    JOIN thread_recipients_raw
      ON google_messages.thread_key = thread_recipients_raw.thread_key
  WHERE
    google_messages.thread_key = ANY($1::text[])
    AND google_messages.deleted_at IS NULL
  WINDOW w AS (PARTITION BY google_messages.thread_key)
  ORDER BY
    google_messages.thread_key, message_date
)
ON CONFLICT (id) DO UPDATE SET
  deleted_at = null,
  updated_at = now(),
  subject = EXCLUDED.subject,
  last_message_id = EXCLUDED.last_message_id,
  last_message_date = EXCLUDED.last_message_date,
  recipients = (
    SELECT
      array_agg(DISTINCT recipient)
    FROM
      unnest(COALESCE(EXCLUDED.recipients, '{}'::text[])) u(recipient)
  ),
  recipients_raw = COALESCE(EXCLUDED.recipients_raw, '[]'::jsonb),
  message_count = EXCLUDED.message_count,
  has_attachments = EXCLUDED.has_attachments,
  is_read = EXCLUDED.is_read
RETURNING
  email_threads.id
