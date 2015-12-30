UPDATE tasks
SET title = $1,
    status = $2,
    "transaction" = $3,
    due_date = $4
WHERE id = $5
