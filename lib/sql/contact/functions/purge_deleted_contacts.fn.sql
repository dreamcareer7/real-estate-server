CREATE OR REPLACE FUNCTION public.purge_deleted_contacts()
 RETURNS setof uuid
 LANGUAGE plpgsql
AS $function$
  DECLARE
    contact_ids uuid[];
  BEGIN
    SELECT array_agg(id) INTO contact_ids FROM contacts WHERE deleted_at IS NOT NULL;
    DELETE FROM contacts_attributes WHERE contact = ANY(contact_ids);
    DELETE FROM crm_associations WHERE contact = ANY(contact_ids);
    RETURN QUERY DELETE FROM contacts WHERE deleted_at IS NOT NULL RETURNING id;
  END;
$function$