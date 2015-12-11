SELECT contacts_tags.tag, tags.name FROM contacts_tags
INNER JOIN tags
ON contacts_tags.tag = tags.id
WHERE contacts_tags.contact = $1