CREATE OR REPLACE FUNCTION get_contact_users(contact_id uuid)
  RETURNS uuid[]
  LANGUAGE SQL
  STABLE
AS $$
  SELECT
    array_agg("user")
  FROM
    contacts_users
  WHERE
    contact = contact_id
$$