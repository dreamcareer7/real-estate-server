UPDATE
  contacts
SET
  next_touch = nt.next_touch
FROM
  (
    SELECT
      cids.id AS contact,
      MIN(COALESCE(last_touch, NOW()) + (tf.touch_freq || ' days')::interval) AS next_touch
    FROM
      unnest($1::uuid[]) AS cids(id)
      JOIN contacts AS c
        ON cids.id = c.id
      JOIN get_contact_touch_freqs($1::uuid[]) AS tf
        ON cids.id = tf.id
    GROUP BY
      cids.id
  ) AS nt
WHERE
  contacts.id = nt.contact
  AND contacts.next_touch IS DISTINCT FROM nt.next_touch
RETURNING
  contacts.id
