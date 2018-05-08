CREATE OR REPLACE FUNCTION clear_is_primary_on_other_attrs() RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
  BEGIN
    UPDATE
      contacts_attributes
    SET
      is_primary = FALSE
    WHERE
      contact = NEW.contact
      AND attribute_def = NEW.attribute_def
      AND id <> NEW.id;
    RETURN NEW;
  END;
$$