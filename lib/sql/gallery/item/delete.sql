UPDATE gallery_items SET
deleted_at = NOW()
WHERE id = $1
