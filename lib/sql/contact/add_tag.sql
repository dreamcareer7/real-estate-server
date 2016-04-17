INSERT INTO tags(entity, tag, type)
    VALUES ($1, $2, 'Contact')
ON CONFLICT (entity, tag, type, "user") DO NOTHING
