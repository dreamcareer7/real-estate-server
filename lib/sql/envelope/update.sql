UPDATE envelopes SET
docusign_id = $1,
status = $2,
updated_at = NOW()
WHERE id = $3