UPDATE envelopes_recipients SET
status = $2, signed_at = $3, updated_at = CLOCK_TIMESTAMP()
WHERE id = $1
RETURNING "user"
