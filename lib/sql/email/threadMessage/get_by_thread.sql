(
  SELECT
    'rechat_email' AS origin,
    id,
    NULL::uuid AS "owner",
    NULL::text AS "owner_email",
    NULL::text AS "owner_name",
    NULL AS "message_id",
    NULL AS "thread_id",
    NULL AS "thread_key",
    NULL AS "internet_message_id",
    FALSE AS "has_attachments",
    NULL::jsonb AS "attachments",
    FALSE AS "in_bound",
    subject,
    NULL AS "snippet",
    NULL AS "unique_body",
    html AS "html_body",
    text AS "text_body",
    "from",
    "to",
    cc,
    bcc,
    created_at AS "message_date"
  FROM
    emails
  WHERE
    mailgun_id = (
      SELECT in_reply_to FROM google_messages WHERE thread_key = $1 AND in_reply_to IS NOT NULL ORDER BY message_created_at ASC LIMIT 1
    ) OR
    mailgun_id = (
      SELECT in_reply_to FROM microsoft_messages WHERE thread_key = $1 AND in_reply_to IS NOT NULL ORDER BY message_created_at ASC LIMIT 1
    )
)
UNION ALL
(
  SELECT
    'gmail' AS origin,
    google_messages.id,
    google_credential AS "owner",
    google_credentials.email AS "owner_email",
    google_credentials.display_name AS "owner_name",
    message_id,
    thread_id,
    thread_key,
    internet_message_id,
    has_attachments,
    attachments,
    in_bound,
    subject,
    NULL AS "snippet",
    NULL AS "unique_body",
    NULL AS "html_body",
    NULL AS "text_body",
    "from",
    "to",
    cc,
    bcc,
    message_date
  FROM
    google_messages
  JOIN
    google_credentials on google_messages.google_credential = google_credentials.id
  WHERE
    thread_key = $1
    AND google_messages.deleted_at IS NULL
  ORDER BY
    google_messages.message_date ASC
)
UNION ALL
(
  SELECT
    'outlook' AS origin,
    microsoft_messages.id,
    microsoft_credential AS "owner",
    microsoft_credentials.email AS "owner_email",
    microsoft_credentials.display_name AS "owner_name",
    message_id,
    thread_id,
    thread_key,
    internet_message_id,
    has_attachments,
    attachments,
    in_bound,
    subject,
    NULL AS "snippet",
    NULL AS "unique_body",
    NULL AS "html_body",
    NULL AS "text_body",
    "from",
    "to",
    cc,
    bcc,
    message_date

  FROM
    microsoft_messages
  JOIN
    microsoft_credentials on microsoft_messages.microsoft_credential = microsoft_credentials.id
  WHERE
    thread_key = $1
    AND microsoft_messages.deleted_at IS NULL
  ORDER BY
    microsoft_messages.message_date ASC
)