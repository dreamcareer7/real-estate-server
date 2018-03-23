INSERT INTO envelopes_recipients
(envelope, role, "order", status) VALUES ($1, $2, $3, 'Created')
RETURNING id