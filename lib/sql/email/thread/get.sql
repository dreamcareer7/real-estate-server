WITH rechat_emails AS (
  (
    SELECT
      e.id,
      g.thread_key,
      e.created_at,
      e."from",
      e."to" || e."cc" || e."bcc" AS "to"
    FROM
      google_messages AS g
      JOIN emails AS e
        ON g.in_reply_to = e.mailgun_id
  ) UNION ALL (
    SELECT
      e.id,
      m.thread_key,
      e.created_at,
      e."from",
      e."to" || e."cc" || e."bcc" AS "to"
    FROM
      microsoft_messages AS m
      JOIN emails AS e
        ON m.in_reply_to = e.mailgun_id
  )
)
SELECT DISTINCT ON (tids.id)
  tids.id,
  COALESCE(r.created_at, g.message_date, m.message_date) AS created_at,
  COALESCE(r."from", g."from", m."from") AS "from",
  COALESCE(r."to", g."to", m."to") AS "to",
  array_agg(COALESCE(r.id, g.id, m.id)) OVER (PARTITION BY tids.id) AS emails,
  ((count(*) OVER (PARTITION BY tids.id)) + (r.thread_key IS NOT NULL)::int)::int AS email_count,
  'thread' AS type
FROM
  unnest($1::text[]) AS tids (id)
  LEFT JOIN google_messages AS g
    ON tids.id = g.thread_key
  LEFT JOIN microsoft_messages AS m
    ON tids.id = m.thread_key
  LEFT JOIN rechat_emails AS r
    ON tids.id = r.thread_key
ORDER BY
  tids.id, COALESCE(r.created_at, g.message_date, m.message_date)