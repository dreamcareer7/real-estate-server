UPDATE important_dates
SET deleted_at = NOW()
WHERE id = $1
