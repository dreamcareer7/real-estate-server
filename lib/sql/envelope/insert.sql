INSERT INTO envelopes (created_by, owner, deal, auto_notify, status) VALUES ($1, $2, $3, $4, 'Sent')
RETURNING id, webhook_token
