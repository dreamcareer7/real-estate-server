UPDATE email_campaigns SET
  "from" = COALESCE ($2, "from"),
  subject = $3,
  include_signature = COALESCE($4, false),
  html = $5,
  text = $6,
  due_at = $7,
  google_credential = $8,
  microsoft_credential = $9,
  notifications_enabled = COALESCE($10, true),
  template = $11,
  individual = COALESCE($12, individual),
  tags = COALESCE($13,tags)
WHERE id = $1