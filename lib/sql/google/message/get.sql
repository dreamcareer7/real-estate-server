SELECT
  id,
  extract(epoch FROM message_date) AS message_date,
  extract(epoch FROM created_at) AS created_at,
  extract(epoch FROM updated_at) AS updated_at,
  extract(epoch FROM deleted_at) AS deleted_at,
  google_credential,
  message_id,
  thread_id,
  internet_message_id,
  in_bound,
  recipients,
  "subject",
  has_attachments,
  attachments,
  from_raw,
  to_raw,
  cc_raw,
  bcc_raw,
  in_reply_to,
  "from",
  "to",
  cc,
  bcc,
  thread_key,
  is_read,
  'google_message' AS "type"
FROM
  google_messages
  JOIN unnest($1::uuid[]) WITH ORDINALITY t (gmid, ord)
    ON google_messages.id = gmid
ORDER BY
  ord
