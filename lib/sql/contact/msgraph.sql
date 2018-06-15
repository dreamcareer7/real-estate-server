WITH outlook_contact_ids AS (
  SELECT
    contacts.id
  FROM
    contacts_attributes
    INNER JOIN contacts ON contacts.id = contacts_attributes.contact
  WHERE
    attribute_type = 'source_type'
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
  contacts_attributes.attribute_type = 'source_id'
  AND contacts_attributes.deleted_at IS NULL;
