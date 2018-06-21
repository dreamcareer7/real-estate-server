CREATE OR REPLACE FUNCTION check_contact_write_access(contact contacts, brand uuid) RETURNS boolean AS
$$
  SELECT contact.brand = brand AND contact.parent IS NULL
$$
LANGUAGE SQL
IMMUTABLE;