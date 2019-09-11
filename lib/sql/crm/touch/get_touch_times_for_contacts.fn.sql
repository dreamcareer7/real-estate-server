CREATE OR REPLACE FUNCTION get_touch_times_for_contacts(uuid[])
RETURNS TABLE (
  contact uuid,
  last_touch timestamptz,
  next_touch timestamptz
)
LANGUAGE SQL
AS $$
  WITH last_touches AS (
    SELECT DISTINCT ON (ca.contact)
      ca.contact,
      crm_tasks.due_date AS last_touch
    FROM
      crm_tasks
      JOIN crm_associations AS ca
        ON ca.crm_task = crm_tasks.id
    WHERE
      ca.contact = ANY($1)
      AND crm_tasks.status = 'DONE'
      AND crm_tasks.task_type <> ALL(ARRAY['Note', 'Other'])
      AND crm_tasks.deleted_at IS NULL
      AND ca.deleted_at IS NULL
    ORDER BY
      ca.contact, crm_tasks.due_date desc
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
    nt.next_touch
  FROM
    unnest($1::uuid[]) AS cids(id)
    LEFT JOIN last_touches AS lt
      ON cids.id = lt.contact
    LEFT JOIN next_touches AS nt
      ON cids.id = nt.contact
$$
