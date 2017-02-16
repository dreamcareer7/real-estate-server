UPDATE envelopes SET
docusign_id = $1,
status = $2,
title = $3,
updated_at = CLOCK_TIMESTAMP()
WHERE id = $4
