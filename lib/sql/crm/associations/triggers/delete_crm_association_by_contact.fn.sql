CREATE FUNCTION delete_crm_association_by_contact ()
  RETURNS trigger
  LANGUAGE plpgsql
AS $$
  BEGIN
    UPDATE
      crm_associations
    SET
      deleted_at = NOW()
    WHERE
      contact = NEW.id;
    RETURN NEW;
  END;
$$