CREATE TRIGGER update_tags_after_attr_insert
AFTER INSERT ON contacts_attributes
REFERENCING NEW TABLE AS new_attrs
FOR EACH STATEMENT
EXECUTE PROCEDURE add_new_tags_from_attributes();
