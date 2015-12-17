INSERT INTO tags(entity, tag, type)
    VALUES ($1, $2, 'contact')
ON CONFLICT (entity, tag, type) DO NOTHING
