INSERT INTO envelopes_recipients
(envelope, "user", role, status) VALUES ($1, $2, $3, 'Sent')
RETURNING id