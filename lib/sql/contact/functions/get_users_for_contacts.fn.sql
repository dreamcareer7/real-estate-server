CREATE OR REPLACE FUNCTION get_users_for_contacts(contact_ids uuid[])
RETURNS TABLE (
  contact_id uuid,
  user_id uuid
)
LANGUAGE SQL
STABLE
AS $$
  (
    SELECT contacts_attributes.contact AS contact_id, users.id AS user_id
    FROM
      contacts_attributes
      INNER JOIN users
        ON users.email = contacts_attributes.text
    WHERE contacts_attributes.deleted_at IS NULL
      AND contacts_attributes.attribute_type = 'email'
      AND contacts_attributes.contact = ANY(contact_ids)
  )
  UNION (
    SELECT contacts_attributes.contact, users.id
    FROM
      contacts_attributes
      INNER JOIN users
        ON users.phone_number = contacts_attributes.text
    WHERE contacts_attributes.deleted_at IS NULL
      AND contacts_attributes.attribute_type = 'phone_number'
      AND contacts_attributes.contact = ANY(contact_ids)
  )
$$