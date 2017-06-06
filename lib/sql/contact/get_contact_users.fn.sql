CREATE OR REPLACE FUNCTION get_contact_users(id uuid) RETURNS TABLE(
  "user" uuid
) AS
$$
  WITH crefs AS
  (
    SELECT DISTINCT(UNNEST(refs)) AS id
    FROM contacts
    WHERE id = $1
  )
  SELECT id FROM users
  WHERE email IN
  (
    SELECT DISTINCT(email)
    FROM contacts_emails
    WHERE contact IN (SELECT id FROM crefs) AND
    deleted_at IS NULL
  )
  UNION
  SELECT id
  FROM users
  WHERE phone_number IN
  (
    SELECT DISTINCT(phone_number)
    FROM contacts_phone_numbers
    WHERE contact IN (SELECT id FROM crefs) AND
    deleted_at IS NULL
  )
$$
LANGUAGE sql;
