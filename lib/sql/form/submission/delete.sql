UPDATE forms_submissions
SET deleted_at = NOW()
WHERE id = $1
