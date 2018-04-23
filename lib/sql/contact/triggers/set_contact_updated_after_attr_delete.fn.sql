CREATE OR REPLACE FUNCTION set_contact_updated_after_attr_delete() RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
  BEGIN
    UPDATE
      contacts
    SET
      updated_at = now()
    WHERE
      id = NEW.contact;
    RETURN NEW;
  END;
$$