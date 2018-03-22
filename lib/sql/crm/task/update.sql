UPDATE
    crm_tasks
SET
    title=$2,
    description=$3,
    due_date=$4,
    status=$5,
    task_type=$6,
    searchable_field=COALESCE($2, '') || ' ' || COALESCE($3, ''),
    updated_at=now()
WHERE
    id = $1
    AND deleted_at IS NULL