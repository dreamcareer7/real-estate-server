CREATE OR REPLACE FUNCTION get_next_touch_for_contacts(uuid[])
RETURNS TABLE (
  contact uuid,
  next_touch timestamptz
)
LANGUAGE SQL
AS $$
  WITH next_touches AS (
    SELECT
      contacts.id,
      MIN(COALESCE(last_touch, NOW()) + (touch_freq || ' days')::interval) AS next_touch
    FROM
      contacts
      JOIN unnest($1::uuid[]) AS cids(id)
        ON contacts.id = cids.id
      JOIN contact_lists_members AS clm
        ON contacts.id = clm.contact
      JOIN contact_search_lists AS csl
        ON csl.id = clm.list
    WHERE
      clm.deleted_at IS NULL
      AND csl.deleted_at IS NULL
      AND touch_freq IS NOT NULL
    GROUP BY
      contacts.id
  )
  SELECT
    id,
    next_touch
  FROM
    unnest($1::uuid[]) AS cids(id)
    LEFT JOIN next_touches USING (id)
$$