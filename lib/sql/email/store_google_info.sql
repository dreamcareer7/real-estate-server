UPDATE emails SET google_id = $2, sent_at = to_timestamp($3) WHERE id = $1