CREATE OR REPLACE FUNCTION update_searchable_field_for_contacts(contact_ids uuid[])
RETURNS void
LANGUAGE SQL
AS $$
  UPDATE
    contacts
  SET
    searchable_field = csf.searchable_field
  FROM
    get_searchable_field_for_contacts(contact_ids) AS csf
  WHERE
    contacts.id = csf.contact
$$