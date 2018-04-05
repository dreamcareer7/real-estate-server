CREATE OR REPLACE FUNCTION user_has_contact_with_another(uuid, uuid) RETURNS boolean
  LANGUAGE SQL
  STABLE
AS $$
  WITH u AS (
    SELECT * FROM users WHERE id = $2
  )
  SELECT
    (count(*) > 0)::boolean AS is_connected
  FROM
    contacts
    INNER JOIN
      contacts_attributes_with_name
      ON contacts.id = contacts_attributes_with_name.contact
  WHERE
    (
      (
        "name" = 'email'
        AND "text" = (SELECT email FROM u)
      )
      OR
      (
        "name" = 'phone_number'
        AND "text" = (SELECT phone_number FROM u)
      )
    )
    AND contacts."user" = $1
    AND contacts.deleted_at IS NULL
$$