CREATE OR REPLACE FUNCTION user_has_contact_with_another(uuid, uuid) RETURNS boolean
  LANGUAGE SQL
  STABLE
AS $$
  WITH u AS (
    SELECT email, phone_number FROM users WHERE id = $2
  )
  SELECT
    (count(*) > 0)::boolean AS is_connected
  FROM
    contacts
    JOIN contacts_attributes
      ON contacts.id = contacts_attributes.contact
  WHERE
    (
      (
        attribute_type = 'email'
        AND "text" = (SELECT email FROM u)
      )
      OR
      (
        attribute_type = 'phone_number'
        AND "text" = (SELECT phone_number FROM u)
      )
    )
    AND contacts."user" = $1
    AND contacts.deleted_at IS NULL
$$