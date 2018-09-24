CREATE OR REPLACE FUNCTION public.delete_contacts_for_user(brand_id uuid)
 RETURNS setof uuid
 LANGUAGE plpgsql
AS $function$
  DECLARE
    contact_ids uuid[];
  BEGIN
    SELECT array_agg(id) INTO contact_ids FROM contacts WHERE brand = brand_id;
    DELETE FROM contacts_attributes WHERE contact = ANY(contact_ids);
    DELETE FROM crm_associations WHERE contact = ANY(contact_ids);
    RETURN QUERY DELETE FROM contacts WHERE brand = brand_id RETURNING id;
  END;
$function$