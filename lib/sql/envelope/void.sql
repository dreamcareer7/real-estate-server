UPDATE envelopes
SET status = 'Voided'::envelope_status
WHERE id = $1
