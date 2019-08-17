(
  SELECT
    'rechat_email' AS origin,
    id,
    NULL::uuid AS "owner",
    NULL::text AS "message_id",
    NULL::text AS "thread_id",
    NULL::text AS "thread_key",
    FALSE AS "has_attachments",
    NULL::jsonb AS "attachments",
    FALSE AS "in_bound",
    subject,
    NULL::text AS "snippet",
    NULL::text AS "unique_body",
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
      SELECT in_reply_to FROM google_messages WHERE thread_key = $1 ORDER BY message_created_at DESC LIMIT 1
    ) OR
    mailgun_id = (
      SELECT in_reply_to FROM microsoft_messages WHERE thread_key = $1 ORDER BY message_created_at DESC LIMIT 1
    )
)
UNION ALL
(
  SELECT
    'gmail' AS origin,
    id,
    google_credential AS "owner",
    message_id,
    thread_id,
    thread_key,
    has_attachments,
    attachments,
    in_bound,
    subject,
    NULL::text AS "snippet",
    NULL::text AS "unique_body",
    NULL::text AS "html_body",
    NULL::text AS "text_body",
    "from",
    "to",
    cc,
    bcc,
    message_date
  FROM
    google_messages
  WHERE
    thread_key = $1
)
UNION ALL
(
  SELECT
    'outlook' AS origin,
    id,
    microsoft_credential AS "owner",
    message_id,
    thread_id,
    thread_key,
    has_attachments,
    attachments,
    in_bound,
    subject,
    NULL::text AS "snippet",
    NULL::text AS "unique_body",
    NULL::text AS "html_body",
    NULL::text AS "text_body",
    "from",
    "to",
    cc,
    bcc,
    message_date
  FROM
    microsoft_messages
  WHERE
    thread_key = $1
)