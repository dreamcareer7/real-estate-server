SELECT id, executed_at FROM email_campaigns WHERE id = $1
FOR UPDATE SKIP LOCKED

