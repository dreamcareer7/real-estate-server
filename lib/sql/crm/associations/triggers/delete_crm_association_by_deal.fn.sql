CREATE FUNCTION delete_crm_association_by_deal ()
  RETURNS trigger
  LANGUAGE plpgsql
AS $$
  BEGIN
    UPDATE
      crm_associations
    SET
      deleted_at = NOW()
    WHERE
      deal = NEW.id;
    RETURN NEW;
  END;
$$