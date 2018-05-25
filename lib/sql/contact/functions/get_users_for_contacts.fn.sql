CREATE OR REPLACE FUNCTION get_users_for_contacts(contact_ids uuid[])
  RETURNS TABLE (
    contact_id uuid,
    user_id uuid
  )
  LANGUAGE plpgsql
  STABLE
AS $$
  DECLARE
    email_attr uuid;
    phone_attr uuid;
  BEGIN
    SELECT id INTO email_attr FROM contacts_attribute_defs WHERE "name" = 'email' AND "global" = true;
    SELECT id INTO phone_attr FROM contacts_attribute_defs WHERE "name" = 'phone_number' AND "global" = true;

    RETURN QUERY (
      SELECT contacts_attributes.contact AS contact_id, users.id AS user_id
      FROM
        contacts_attributes
        INNER JOIN users
          ON users.email = contacts_attributes.text
      WHERE contacts_attributes.deleted_at IS NULL
        AND contacts_attributes.attribute_def = email_attr
        AND contacts_attributes.contact = ANY(contact_ids)
    )
    UNION (
      SELECT contacts_attributes.contact, users.id
      FROM
        contacts_attributes
        INNER JOIN users
          ON users.phone_number = contacts_attributes.text
      WHERE contacts_attributes.deleted_at IS NULL
        AND contacts_attributes.attribute_def = phone_attr
        AND contacts_attributes.contact = ANY(contact_ids)
    );
  END;
$$