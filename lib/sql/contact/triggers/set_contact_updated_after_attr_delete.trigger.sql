/* This is done using a trigger, becuase contact attributes
 * may be deleted from multiple actions, like direct user
 * action, or deleting a custom attribute.
 */
CREATE TRIGGER set_contact_updated_after_attr_delete
AFTER UPDATE OF deleted_at
ON contacts_attributes
FOR EACH ROW
EXECUTE PROCEDURE set_contact_updated_after_attr_delete()