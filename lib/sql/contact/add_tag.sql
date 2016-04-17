INSERT INTO tags(entity, tag, type, "user")
    VALUES ($1, $2, 'Contact', $3)
ON CONFLICT (entity, tag, type, "user") DO NOTHING
