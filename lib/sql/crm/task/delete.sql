WITH d as (
    UPDATE
        crm_tasks
    SET
        deleted_at = CLOCK_TIMESTAMP()
    WHERE
        id = $1
        AND assignee = $2
        AND deleted_at IS NULL
)
UPDATE
    reminders
SET
    deleted_at = CLOCK_TIMESTAMP()
WHERE
    task = $1