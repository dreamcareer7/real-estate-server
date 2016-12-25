UPDATE envelopes SET
docusign_id = $1,
status = $2,
title = $3,
updated_at = NOW()
WHERE id = $4