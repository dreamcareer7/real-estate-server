WITH ucad AS (
  UPDATE
    contacts_attribute_defs
  SET
    deleted_at = now()
  WHERE
    id = $1
  RETURNING
    id, searchable
),
uca AS (
  UPDATE  /* We should delete contact attributes with the deleted attribute_def */
    contacts_attributes
  SET
    deleted_at = now()
  WHERE
    attribute_def = $1
  RETURNING
    id, contact
),
uc AS (
  UPDATE  /* Set updated_at for affected contacts */
    contacts
  SET
    updated_at = now()
  WHERE
    id = ANY(SELECT contact FROM uca)
),
ucsf AS (
  SELECT (
    CASE
      WHEN searchable IS True THEN
        update_searchable_field_for_contacts(SELECT array_agg(contact) FROM uca)
    END
  )
  FROM ucad
)
SELECT
  *
FROM
  uca
