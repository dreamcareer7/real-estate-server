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
    AND CASE WHEN $1::uuid[] IS NULL THEN TRUE ELSE id = ANY($1) END
    AND CASE WHEN $3::uuid IS NULL THEN TRUE ELSE contact = $3 END
    AND CASE WHEN $4::uuid IS NULL THEN TRUE ELSE deal = $4 END
    AND CASE WHEN $5::uuid IS NULL THEN TRUE ELSE listing = $5 END
ORDER BY created_at
OFFSET CASE WHEN $6::INT IS NULL THEN 0 ELSE $6 END
LIMIT CASE WHEN $7::INT IS NULL THEN 0 ELSE $7 END