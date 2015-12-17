SELECT contacts.* FROM contacts
INNER JOIN tags
ON contacts.id = tags.entity
WHERE tags.tag IN ($1) AND tags.type = 'contact'