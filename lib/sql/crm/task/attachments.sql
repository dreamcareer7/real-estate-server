SELECT files_relations.file as id
FROM files_relations
JOIN files
    ON files_relations.file = files.id
WHERE files_relations.role = 'CrmTask'
        AND files_relations.role_id = $1
        AND files.deleted_at IS NULL
        AND files_relations.deleted_at IS NULL 
