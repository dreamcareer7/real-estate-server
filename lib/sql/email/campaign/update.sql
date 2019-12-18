UPDATE email_campaigns SET
subject = $2,
include_signature = COALESCE($3, false),
html = $4,
text = $5,
due_at = $6,
google_credential = $7,
microsoft_credential = $8
WHERE id = $1