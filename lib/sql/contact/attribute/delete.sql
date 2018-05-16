WITH uc AS (
  UPDATE
    contacts
  SET
    updated_at = now(),
    searchable_field = sfc.searchable_field
  FROM
    get_searchable_field_for_contacts(ARRAY[$1::uuid]) sfc
  WHERE
    id = sfc.contact
)
UPDATE
  contacts_attributes
SET
  deleted_at = now()
WHERE
  contact = $1
  AND id = $2
RETURNING id