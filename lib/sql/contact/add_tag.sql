INSERT INTO contacts_tags(contact, tag)
    VALUES ($1, $2)
ON CONFLICT (contact, tag) DO NOTHING
RETURNING id
