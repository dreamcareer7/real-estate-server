SELECT DISTINCT(contact)
FROM (
    SELECT contact, count(contact) FROM contacts_attributes
    WHERE attribute_type = 'tag' AND deleted_at IS NULL
    AND attribute->>'tag' IN (SELECT unnest($2::text[]))
    GROUP BY contact
) AS c
INNER JOIN contacts
ON c.contact = contacts.id
WHERE contacts.deleted_at IS NULL AND
contacts."user" = $1 AND
c.count = array_length($2::text[], 1)