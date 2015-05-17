UPDATE recommendations
SET updated_at = NOW()
WHERE referred_shortlist = $1 AND
      object = $2
