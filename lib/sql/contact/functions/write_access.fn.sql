CREATE OR REPLACE FUNCTION public.check_contact_write_access(
  contact contacts,
  curr_brand uuid,
  curr_user uuid
) RETURNS boolean
  LANGUAGE sql
  IMMUTABLE AS $$
    SELECT contact.brand = curr_brand OR (
      curr_user IS NOT NULL AND EXISTS(
        SELECT 1
        FROM contacts_roles AS cr
        WHERE
          cr.brand = curr_brand AND
          cr."user" = curr_user AND
          cr.contact = contact.id AND
          deleted_at IS NULL AND
          role IN ('assignee', 'owner')
      )
    )
$$
