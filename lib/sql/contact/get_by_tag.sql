SELECT contacts.id FROM contacts
INNER JOIN tags
ON contacts.id = tags.entity
WHERE tags.type = $1 AND tags.tag =ANY($2::text[])