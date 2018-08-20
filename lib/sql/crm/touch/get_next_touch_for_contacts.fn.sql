CREATE OR REPLACE FUNCTION get_next_touch_for_contacts(uuid[])
RETURNS TABLE (
  contact uuid,
  next_touch timestamptz
)
LANGUAGE SQL
AS $$
  SELECT
    contacts.id,
    MIN(COALESCE(last_touch, NOW()) + (touch_freq || ' days')::interval) AS next_touch
  FROM
    contacts
    JOIN unnest($1::uuid[]) AS cids(id)
      ON contacts.id = cids.id
    LEFT JOIN contact_lists_members AS clm
      ON contacts.id = clm.contact
    LEFT JOIN contact_search_lists AS csl
      ON csl.id = clm.list
  GROUP BY
    contacts.id
$$