UPDATE envelopes
SET status = 'Voided'::envelope_status,
    updated_at = CLOCK_TIMESTAMP()
WHERE id = $1
