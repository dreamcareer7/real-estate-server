INSERT INTO envelopes (created_by, deal, auto_notify, status) VALUES ($1, $2, $3, 'Sent')
RETURNING id, webhook_token
