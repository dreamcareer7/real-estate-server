UPDATE email_campaigns SET
  failed_at = NOW(),
  failed_within = $2,
  failure = $3
WHERE id = $1
