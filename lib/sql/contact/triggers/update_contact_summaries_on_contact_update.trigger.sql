CREATE TRIGGER update_contact_summaries_on_contact_update
AFTER UPDATE ON contacts
REFERENCING NEW TABLE AS updated_contacts
FOR EACH STATEMENT
EXECUTE PROCEDURE update_contact_summaries_from_contact();
