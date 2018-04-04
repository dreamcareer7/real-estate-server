CREATE TRIGGER delete_crm_association_after_delete_deal
  AFTER UPDATE OF deleted_at ON crm_associations
  FOR EACH ROW
  WHEN (NEW.deleted_at IS NOT NULL)
  EXECUTE PROCEDURE delete_crm_association_by_deal()
