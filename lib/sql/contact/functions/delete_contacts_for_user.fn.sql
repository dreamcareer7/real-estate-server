CREATE OR REPLACE FUNCTION public.delete_contacts_for_user(email text)
 RETURNS setof uuid
 LANGUAGE plpgsql
AS $function$
  DECLARE
    "user_id" uuid;
    contact_ids uuid[];
  BEGIN
    SELECT id INTO "user_id" FROM users WHERE users.email = $1;
    SELECT array_agg(id) INTO contact_ids FROM contacts WHERE "created_by" = "user_id";
    DELETE FROM contacts_attributes WHERE contact = ANY(contact_ids);
    DELETE FROM crm_associations WHERE contact = ANY(contact_ids);
    RETURN QUERY DELETE FROM contacts WHERE "created_by" = "user_id" RETURNING id;
  END;
$function$