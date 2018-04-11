CREATE TRIGGER fix_is_primary_on_attr_insert_or_update
AFTER INSERT OR UPDATE OF is_primary
ON contacts_attributes
FOR EACH ROW
WHEN (NEW.is_primary = true)
EXECUTE PROCEDURE clear_is_primary_on_other_attrs()