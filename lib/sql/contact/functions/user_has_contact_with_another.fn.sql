CREATE OR REPLACE FUNCTION user_has_contact_with_another(uuid, uuid) RETURNS boolean
  LANGUAGE SQL
  STABLE
AS $$
  SELECT EXISTS(
    SELECT c.id
    FROM contacts c
    JOIN contacts_users cu
      ON c.id = cu.contact
    WHERE c."user" = $1
     AND cu."user" = $2
  ) AS is_connected
$$