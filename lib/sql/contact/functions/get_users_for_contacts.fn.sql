CREATE OR REPLACE FUNCTION get_users_for_contacts(contact_ids uuid[])
RETURNS TABLE (
  contact_id uuid,
  user_id uuid
)
LANGUAGE SQL
STABLE
AS $$
  SELECT
    contact AS contact_id,
    "user" AS user_id
  FROM
    contacts_users
  WHERE
    contact = ANY(contact_ids)
$$