UPDATE tasks
SET title = $1,
    status = $2,
    "transaction" = $3,
    due_date = CASE WHEN $4::bigint IS NULL THEN NULL ELSE to_timestamp($4) END
WHERE id = $5
