CREATE OR REPLACE FUNCTION public.check_contact_delete_access(contact contacts, brand uuid)
  RETURNS boolean
  LANGUAGE sql
  IMMUTABLE AS $$
    SELECT contact.brand = brand
  $$
