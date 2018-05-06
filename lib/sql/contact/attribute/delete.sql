WITH uca AS (
  UPDATE
    contacts_attributes
  SET
    deleted_at = now()
  WHERE
    contact = $1
    AND id = $2
  RETURNING attribute_def
),
uc AS (
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
SELECT (
  CASE
    WHEN searchable IS True THEN update_searchable_field_for_contacts(ARRAY[$1::uuid])
  END
)
FROM
  uca
  JOIN contacts_attribute_defs ON uca.attribute_def = contacts_attribute_defs.id
WHERE
  deleted_at IS NULL
