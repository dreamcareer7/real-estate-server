UPDATE recommendations
SET status = 'Unpinned'
WHERE id = $1
