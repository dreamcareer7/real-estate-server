UPDATE tasks
SET title = $1,
    status = $2,
    "transaction" = $3,
    due_date = CASE WHEN $4::float IS NULL THEN NULL ELSE to_timestamp($4::float) END,
    private = $5,
    expense = $6
WHERE id = $7
