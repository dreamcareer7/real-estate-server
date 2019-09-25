SELECT 
  'thread' AS type,

  thread_keys.id AS id,

  (SELECT count(*) FROM (
    (
      SELECT
        id
      FROM
        emails
      WHERE
        mailgun_id = (
          SELECT
            in_reply_to
          FROM
            google_messages
          WHERE
            google_messages.thread_key = thread_keys.id
          ORDER BY
            message_created_at ASC
          LIMIT 1

        ) OR

        mailgun_id = (
          SELECT
            in_reply_to
          FROM
            microsoft_messages
          WHERE
            microsoft_messages.thread_key = thread_keys.id
          ORDER BY
            message_created_at ASC
          LIMIT 1
        )
    )
    UNION ALL
    (
      SELECT
        id
      FROM
        google_messages
      WHERE
        google_messages.thread_key = thread_keys.id
    )
    UNION ALL
    (
      SELECT
        id
      FROM
        microsoft_messages
      WHERE
        microsoft_messages.thread_key = thread_keys.id
    )
  ) AS thread_emails)::INT AS email_count

FROM (
  SELECT unnest($1::TEXT[]) AS id
) AS thread_keys