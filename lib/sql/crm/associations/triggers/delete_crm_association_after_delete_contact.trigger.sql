CREATE TRIGGER delete_crm_association_after_delete_contact
  AFTER UPDATE OF deleted_at ON contacts
  FOR EACH ROW
  WHEN (NEW.deleted_at IS NOT NULL)
  EXECUTE PROCEDURE delete_crm_association_by_contact()