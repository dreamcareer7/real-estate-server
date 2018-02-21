UPDATE
    crm_tasks
SET
    title=$3,
    description=$4,
    due_date=$5,
    status=$6,
    task_type=$7,
    contact=$8,
    deal=$9,
    listing=$10,
    updated_at=now()
WHERE
    id = $1
    AND assignee = $2
    AND deleted_at IS NULL