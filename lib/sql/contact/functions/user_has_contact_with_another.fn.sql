CREATE OR REPLACE FUNCTION user_has_contact_with_another(uuid, uuid) RETURNS boolean
  LANGUAGE SQL
  STABLE
AS $$
  SELECT EXISTS(
    SELECT c.id
    FROM contacts c
    JOIN contacts_users cu
      ON c.id = cu.contact
    WHERE c."user" = '163db054-f5bb-11e5-bf57-f23c91b0d077'::uuid
     AND cu."user" = 'fc1ae8e6-480f-11e8-8b24-0a95998482ac'::uuid
  ) AS is_connected
$$