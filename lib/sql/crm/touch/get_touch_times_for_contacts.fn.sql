CREATE OR REPLACE FUNCTION get_touch_times_for_contacts(uuid[])
RETURNS TABLE (
  contact uuid,
  last_touch timestamptz,
  last_touch_action text,
  next_touch timestamptz
)
LANGUAGE SQL
AS $$
  WITH last_touches AS (
    SELECT
      cids.id AS contact,
      last_touch,
      action AS last_touch_action
    FROM
      unnest($1::uuid[]) AS cids(id)
      LEFT JOIN crm_last_touches clt
        ON cids.id = clt.contact
  ),
  next_touches AS (
    SELECT
      cids.id AS contact,
      MIN(COALESCE(last_touch, NOW()) + (touch_freq || ' days')::interval) AS next_touch
    FROM
      unnest($1::uuid[]) AS cids(id)
      JOIN get_contact_touch_freqs($1::uuid[]) AS tf
        ON cids.id = tf.id
      LEFT JOIN last_touches
        ON last_touches.contact = cids.id
    GROUP BY
      cids.id
  )
  SELECT
    cids.id AS contact,
    lt.last_touch,
    lt.last_touch_action,
    nt.next_touch
  FROM
    unnest($1::uuid[]) AS cids(id)
    LEFT JOIN last_touches AS lt
      ON cids.id = lt.contact
    LEFT JOIN next_touches AS nt
      ON cids.id = nt.contact
$$
