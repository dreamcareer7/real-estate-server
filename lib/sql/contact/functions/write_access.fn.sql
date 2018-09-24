CREATE OR REPLACE FUNCTION check_contact_write_access(contact contacts, brand uuid) RETURNS boolean AS
$$
  SELECT contact.brand = brand
$$
LANGUAGE SQL
IMMUTABLE;