INSERT INTO microsoft_messages
	(
        microsoft_credential, message_id, thread_id, thread_key, internet_message_id, in_reply_to,  in_bound, is_read, is_archived, recipients, 
        "subject", has_attachments, attachments, 
        from_raw, to_raw, cc_raw, bcc_raw, "from", "to", cc, bcc, 
        message_created_at, message_date, deleted_at
    )
SELECT 
    t.microsoft_credential, t.message_id, t.thread_id, t.thread_key, t.internet_message_id, t.in_reply_to, t.in_bound, t.is_read, t.is_archived, t.recipients,
    t."subject", t.has_attachments, t.attachments,
    t.from_raw, t.to_raw, t.cc_raw, t.bcc_raw, t."from", t."to", t.cc, t.bcc,
    t.message_created_at, t.message_date, t.deleted_at
FROM
	json_to_recordset($1::json) as t(
        microsoft_credential uuid, message_id text, thread_id text, thread_key text, internet_message_id text, in_reply_to text, in_bound bool, 
        is_read bool, is_archived bool, recipients text[], 
        "subject" text, has_attachments bool, attachments jsonb, 
        from_raw jsonb, to_raw jsonb, cc_raw jsonb, bcc_raw jsonb, "from" text, "to" text[], cc text[], bcc text[], 
        message_created_at int8, message_date timestamptz, deleted_at timestamptz, updated_at timestamptz)
ON conflict 
	(microsoft_credential, message_id) 
WHERE 
	message_id IS NOT NULL
DO UPDATE
SET 
    message_id = EXCLUDED.message_id,
    thread_id = EXCLUDED.thread_id,
    thread_key = EXCLUDED.thread_key,
    in_reply_to = EXCLUDED.in_reply_to,
    in_bound = EXCLUDED.in_bound,
    is_read = EXCLUDED.is_read,
    is_archived = EXCLUDED.is_archived,
    recipients = EXCLUDED.recipients,

    "subject" = EXCLUDED."subject",
    has_attachments = EXCLUDED.has_attachments,
    attachments = EXCLUDED.attachments,

    from_raw = EXCLUDED.from_raw,
    to_raw = EXCLUDED.to_raw,
    cc_raw = EXCLUDED.cc_raw,
    bcc_raw = EXCLUDED.bcc_raw,

    "from" = EXCLUDED."from",
    "to" = EXCLUDED."to",
    cc = EXCLUDED.cc,
    bcc = EXCLUDED.bcc,

    message_created_at = EXCLUDED.message_created_at,
    message_date = EXCLUDED.message_date,

    deleted_at = EXCLUDED.deleted_at,
    updated_at = NOW()
RETURNING
    "id", microsoft_credential, internet_message_id, message_id, thread_id, thread_key