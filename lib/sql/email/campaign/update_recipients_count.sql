UPDATE email_campaigns SET
  recipients_count = $2::int
WHERE
  id = $1::uuid
