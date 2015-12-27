UPDATE transactions
SET deleted_at = NOW()
WHERE id = $1
