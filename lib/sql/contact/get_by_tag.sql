SELECT DISTINCT(contacts_attributes.contact)
FROM contacts_attributes
INNER JOIN contacts
ON contacts_attributes.contact = contacts.id
WHERE contacts.deleted_at IS NULL AND
contacts."user" = $1 AND
contacts_attributes.attribute_type = 'tag' AND
(contacts_attributes.attribute)->>'tag' = ANY($2);
