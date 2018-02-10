INSERT INTO crm_tasks (
    created_by,
    assignee,
    title,
    description,
    due_date,
    status,
    task_type,
    contact,
    deal,
    listing
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
    $9,
    $10
)
RETURNING id