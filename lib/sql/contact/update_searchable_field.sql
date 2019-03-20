UPDATE
  contacts
SET
  search_field = csf.search_field
FROM
  get_search_field_for_contacts($1::uuid[]) csf
WHERE
  id = csf.contact
