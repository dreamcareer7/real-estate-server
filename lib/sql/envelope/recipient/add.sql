INSERT INTO envelopes_recipients
(envelope, role, status) VALUES ($1, $2, 'Sent')
RETURNING id