DELETE FROM contacts_tags
WHERE contact = $1 AND tag = $2
