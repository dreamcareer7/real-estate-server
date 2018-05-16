CREATE OR REPLACE FUNCTION public.delete_contacts_for_user(text)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
  DECLARE
    "user_id" uuid;
  BEGIN
    SELECT id INTO "user_id" FROM users WHERE email = $1;
    WITH c AS (
      SELECT id FROM contacts WHERE "user" = "user_id"
    ), ca AS (
      DELETE FROM contacts_attributes WHERE contact IN (SELECT id FROM c)
    ), cas AS (
      DELETE FROM crm_associations WHERE contact IN (SELECT id FROM c)
    )
    DELETE FROM contacts WHERE "user" = "user_id";
  END;
$function$