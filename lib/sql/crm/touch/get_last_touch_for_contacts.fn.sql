CREATE OR REPLACE FUNCTION get_last_touch_for_contacts(uuid[])
RETURNS TABLE (
  contact uuid,
  last_touch timestamptz
)
LANGUAGE SQL
AS $$
  SELECT DISTINCT ON (clm.contact)
    clm.contact,
    touches.timestamp AS last_touch
  FROM
    touches
    JOIN crm_associations AS ca
      ON ca.touch = touches.id
    JOIN contact_lists_members AS clm
      ON clm.contact = ca.contact
    JOIN contact_search_lists AS csl
      ON csl.id = clm.list
  WHERE
    clm.contact = ANY($1)
  ORDER BY
    clm.contact, touches.timestamp desc
$$