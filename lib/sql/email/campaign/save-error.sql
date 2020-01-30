UPDATE email_campaigns SET
  errored_at = NOW(),
  errored_within = $2,
  error = $3
WHERE id = $1
