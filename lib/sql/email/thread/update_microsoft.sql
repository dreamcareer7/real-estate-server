INSERT INTO email_threads (
  id,
  microsoft_credential,
  "user",
  brand,
  "subject",
  last_message_id,
  first_message_in_reply_to,
  first_message_date,
  last_message_date,
  recipients,
  recipients_raw,
  senders_raw,
  message_count,
  has_attachments,
  is_read
)
(
  WITH thread_recipients AS (
    SELECT
      thread_key, array_agg(DISTINCT recipient) AS recipients
    FROM
      microsoft_messages, unnest(recipients) AS t(recipient)
    WHERE
      microsoft_messages.thread_key = ANY($1::text[])
      AND microsoft_messages.deleted_at IS NULL
    GROUP BY
      thread_key
  ), distinct_recipients_raw AS (
    SELECT DISTINCT ON (thread_key, address)
      thread_key, name, address
    FROM
      microsoft_messages,
      jsonb_to_recordset(to_raw || from_raw) AS recipients_raw(name text, address text)
    WHERE
      microsoft_messages.thread_key = ANY($1::text[])
      AND microsoft_messages.deleted_at IS NULL
    ORDER BY
      thread_key, address
  ), distinct_senders_raw AS (
    SELECT DISTINCT ON (thread_key, address)
      thread_key, name, address
    FROM
      microsoft_messages,
      jsonb_to_record(from_raw) AS recipients_raw(name text, address text)
    WHERE
      microsoft_messages.thread_key = ANY($1::text[])
      AND microsoft_messages.deleted_at IS NULL
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
  ), thread_senders_raw AS (
    SELECT
      thread_key, jsonb_agg(jsonb_build_object(
        'name', name,
        'address', address
      )) AS senders_raw
    FROM
      distinct_senders_raw
    GROUP BY
      thread_key
  )
  SELECT DISTINCT ON (microsoft_messages.thread_key)
    microsoft_messages.thread_key,
    microsoft_credential,
    microsoft_credentials."user",
    microsoft_credentials.brand,
    last_value(subject) OVER (w ORDER BY message_date) AS "subject",
    last_value(message_id) OVER (w ORDER BY message_date) AS last_message_id,
    first_value(microsoft_messages.in_reply_to) OVER (w ORDER BY message_date) AS first_message_in_reply_to,
    min(message_date) OVER (w) AS first_message_date,
    max(message_date) OVER (w) AS last_message_date,
    thread_recipients.recipients AS recipients,
    thread_recipients_raw.recipients_raw,
    thread_senders_raw.senders_raw,
    count(*) OVER (w) AS message_count,
    SUM(has_attachments::int) OVER (w) > 0 AS has_attachments,
    AVG(is_read::int) OVER (w) = 1 AS is_read
  FROM
    microsoft_messages
    JOIN microsoft_credentials
      ON microsoft_messages.microsoft_credential = microsoft_credentials.id
    JOIN thread_recipients
      ON microsoft_messages.thread_key = thread_recipients.thread_key
    JOIN thread_recipients_raw
      ON microsoft_messages.thread_key = thread_recipients_raw.thread_key
    JOIN thread_senders_raw
      ON microsoft_messages.thread_key = thread_senders_raw.thread_key
  WHERE
    microsoft_messages.thread_key = ANY($1::text[])
    AND microsoft_messages.deleted_at IS NULL
  WINDOW w AS (PARTITION BY microsoft_messages.thread_key)
  ORDER BY
    microsoft_messages.thread_key, message_date
)
ON CONFLICT (id) DO UPDATE SET
  deleted_at = EXCLUDED.deleted_at,
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
