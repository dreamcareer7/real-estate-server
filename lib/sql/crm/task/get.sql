SELECT
    crm_tasks.*,
    (
        SELECT id FROM deals WHERE id = crm_tasks.deal AND brand IN (SELECT user_brands($2))
    ) as deal,
    (
        SELECT id FROM contacts WHERE id = crm_tasks.contact AND "user" = $2
    ) as contact,
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
JOIN unnest($1::uuid[]) WITH ORDINALITY t(did, ord) ON crm_tasks.id = did
WHERE
    deleted_at IS NULL
    AND assignee = $2
ORDER BY t.ord