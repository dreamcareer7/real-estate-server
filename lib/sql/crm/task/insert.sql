INSERT INTO crm_tasks (
    created_by,
    brand,
    assignee,
    title,
    description,
    due_date,
    status,
    task_type,
    searchable_field
)
VALUES (
    $1,
    $2,
    $3,
    $4,
    $5,
    $6,
    $7,
    $8,
    COALESCE($4, '') || ' ' || COALESCE($5, '')
)
RETURNING id