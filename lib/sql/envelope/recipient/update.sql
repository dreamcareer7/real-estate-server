UPDATE envelopes_recipients SET
status = $2, signed_at = $3, updated_at = CLOCK_TIMESTAMP()
WHERE id = $1

-- We should return _something_ so the caller can count affected rows.
RETURNING id
