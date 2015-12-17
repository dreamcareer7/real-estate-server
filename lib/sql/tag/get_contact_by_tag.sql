SELECT contacts.* FROM contacts
INNER JOIN tags
ON contacts.id = tags.entity
WHERE tags.tag = $1