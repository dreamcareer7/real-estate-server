WITH lt AS (
  SELECT
    c.id,
    max(t.last_message_date) AS last_touch
  FROM
    contacts AS c
    JOIN email_threads AS t
      ON c.email && t.recipients
  WHERE
    t.id = ANY($1::text[])
    AND c.brand = $2::uuid
    AND t.brand = $2::uuid
  GROUP BY
    c.id
)
UPDATE
  contacts
SET
  last_touch = lt.last_touch,
  last_touch_action = 'email'
FROM
  lt
WHERE
  lt.id = contacts.id
  AND (
    contacts.last_touch IS NULL
    OR contacts.last_touch < lt.last_touch
  )
RETURNING
  contacts.id
