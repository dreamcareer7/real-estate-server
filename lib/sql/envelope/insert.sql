INSERT INTO envelopes (created_by, deal, status) VALUES ($1, $2, 'Sent')
RETURNING id