CREATE OR REPLACE FUNCTION get_last_touch_for_contacts(uuid[])
RETURNS TABLE (
  contact uuid,
  last_touch timestamptz
)
LANGUAGE SQL
AS $$
  SELECT DISTINCT ON (ca.contact)
    ca.contact,
    touches.timestamp AS last_touch
  FROM
    touches
    JOIN crm_associations AS ca
      ON ca.touch = touches.id
  WHERE
    ca.contact = ANY($1)
  ORDER BY
    ca.contact, touches.timestamp desc
$$