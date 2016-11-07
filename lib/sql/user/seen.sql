UPDATE users SET
  last_seen_by = $2,
  last_seen_at = $3
WHERE id = $1
