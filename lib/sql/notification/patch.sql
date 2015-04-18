UPDATE notifications
SET read = $2,
    updated_at = NOW()
WHERE id = $1
