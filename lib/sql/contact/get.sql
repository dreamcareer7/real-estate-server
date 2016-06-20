SELECT *,
       'contact' AS type,
       EXTRACT(EPOCH FROM contacts.created_at) AS created_at,
       EXTRACT(EPOCH FROM contacts.updated_at) AS updated_at,
       EXTRACT(EPOCH FROM contacts.deleted_at) AS deleted_at,
       EXTRACT(EPOCH FROM contacts.birthday)   AS birthday,
       (
        SELECT ARRAY_AGG(tag) FROM (
          SELECT tag FROM tags
          WHERE entity = contacts.id AND type = 'Contact'
          ORDER BY tag
        ) t
       ) as tags
FROM contacts
WHERE id = $1
