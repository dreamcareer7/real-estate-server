CREATE OR REPLACE FUNCTION check_contact_read_access(contact contacts, user_id uuid) RETURNS boolean AS
$$
  SELECT contact."user" = user_id
$$
LANGUAGE SQL
IMMUTABLE;