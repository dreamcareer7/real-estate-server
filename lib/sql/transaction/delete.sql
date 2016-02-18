WITH delete_tasks AS (
    UPDATE tasks
    SET deleted_at = NOW()
    WHERE transaction = $1
)
UPDATE transactions
SET deleted_at = NOW()
WHERE id = $1
