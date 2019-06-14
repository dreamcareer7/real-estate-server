CREATE TRIGGER delete_crm_association_after_delete_contact
AFTER UPDATE ON contacts
REFERENCING NEW TABLE AS deleted_contacts
FOR EACH STATEMENT
EXECUTE PROCEDURE delete_crm_association_by_contact();
