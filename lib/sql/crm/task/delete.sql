UPDATE
    crm_tasks
SET
    deleted_at = CLOCK_TIMESTAMP()
WHERE
    id = $1
    AND deleted_at IS NULL
