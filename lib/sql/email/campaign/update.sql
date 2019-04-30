UPDATE email_campaigns SET
subject = $2,
include_signature = COALESCE($3, false),
html = $4,
due_at = $5
WHERE id = $1
