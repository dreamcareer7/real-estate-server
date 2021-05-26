WITH last_touches AS (
  UPDATE
    contacts
  SET
    last_touch = to_timestamp($2),
    last_touch_action = $3
  WHERE
    id = ANY($1::uuid[])
    AND (last_touch IS NULL) OR (last_touch < to_timestamp($2))
  RETURNING
    contacts.id
), tf AS (
  SELECT
    lt.id,
    t.touch_freq
  FROM
    last_touches AS lt
    JOIN get_contact_touch_freqs($1::uuid[]) AS t
      USING (id)
)
UPDATE
  contacts
SET
  next_touch = COALESCE(last_touch, created_at) + (touch_freq || ' days')::interval
FROM
  tf
WHERE
  contacts.id = tf.id
