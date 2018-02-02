SELECT
    crm_tasks.*,
    'crm_task' as type,
    (
        SELECT
            ARRAY_AGG(id ORDER BY "created_at")
        FROM
            reminders
        WHERE
            task = crm_tasks.id
            AND deleted_at IS NULL
    ) as reminders
FROM
    crm_tasks
WHERE
    deleted_at IS NULL
    AND assignee = $2
    AND id = ANY($1)
