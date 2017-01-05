UPDATE envelopes
SET status = 'Voided'::envelope_status,
    updated_at = NOW()
WHERE id = $1
