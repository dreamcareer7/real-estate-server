UPDATE envelopes_recipients SET
status = $2, signed_at = $3, updated_at = NOW()
WHERE id = $1
RETURNING "user"