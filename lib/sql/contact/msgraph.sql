WITH source_type_attr AS (
  SELECT id FROM contacts_attribute_defs WHERE name = 'source_type'
),
source_id_attr AS (
  SELECT id FROM contacts_attribute_defs WHERE name = 'source_id'
)
outlook_contact_ids AS (
  SELECT
    contacts.id
  FROM
    contacts_attributes
    INNER JOIN contacts ON contacts.id = contacts_attributes.contact
  WHERE
    attribute_def = ANY(SELECT id FROM source_type_attr)
    AND text = 'External/Outlook'
    AND contacts_attributes.deleted_at IS NULL
    AND contacts."user" = $1::uuid
)
SELECT
  contacts.id,
  contacts_attributes.text AS source_id,
  (contacts.updated_at <> contacts.created_at) AS is_changed
FROM outlook_contact_ids
  JOIN contacts USING (id)
  JOIN contacts_attributes ON contacts.id = contacts_attributes.contact
WHERE
  contacts_attributes.attribute_def = ANY(SELECT id FROM source_id_attr)
  AND contacts_attributes.deleted_at IS NULL;
