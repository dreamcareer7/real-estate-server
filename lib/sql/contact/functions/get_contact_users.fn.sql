CREATE OR REPLACE FUNCTION get_contact_users(contact_id uuid)
  RETURNS uuid[]
  LANGUAGE SQL
  STABLE
AS $$
  SELECT array_agg(id) FROM users
  WHERE
    email IN (
      SELECT "text"
      FROM contacts_attributes_with_name
      WHERE
        contact = contact_id
        AND "name" = 'email'
    )
    OR phone_number IN (
      SELECT "text"
      FROM contacts_attributes_with_name
      WHERE
        contact = contact_id
        AND "name" = 'phone_number'
    )
$$;
