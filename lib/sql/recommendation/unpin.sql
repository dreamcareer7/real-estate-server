UPDATE recommendations
SET status = 'Unpinned',
    updated_at = NOW()
WHERE id = $1
