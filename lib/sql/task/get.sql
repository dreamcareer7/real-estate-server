SELECT 'task' AS TYPE,
       *,
       (
        SELECT ARRAY_AGG(contact)
        FROM task_contacts
        WHERE "task" = $1
       ) AS contacts,
       (
        SELECT ARRAY_AGG(attachment)
        FROM attachments_eav
        WHERE object = $1
       ) AS attachments,
       EXTRACT(EPOCH FROM created_at) AS created_at,
       EXTRACT(EPOCH FROM updated_at) AS updated_at,
       EXTRACT(EPOCH FROM deleted_at) AS deleted_at,
       EXTRACT(EPOCH FROM due_date) AS due_date
FROM tasks
WHERE id = $1
LIMIT 1
