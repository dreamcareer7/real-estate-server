UPDATE
  contacts
SET
  searchable_field = csf.searchable_field
FROM
  get_searchable_field_for_contacts($1::uuid[]) csf
WHERE
  id = csf.contact