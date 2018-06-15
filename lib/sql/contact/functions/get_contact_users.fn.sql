CREATE OR REPLACE FUNCTION get_contact_users(contact_id uuid)
  RETURNS uuid[]
  LANGUAGE SQL
  STABLE
AS $$
  SELECT array_agg(id) FROM users
  WHERE
    email IN (
      SELECT "text"
      FROM contacts_attributes
      WHERE
        contact = contact_id
        AND attribute_type = 'email'
    )
    OR phone_number IN (
      SELECT "text"
      FROM contacts_attributes
      WHERE
        contact = contact_id
        AND attribute_type = 'phone_number'
    )
$$