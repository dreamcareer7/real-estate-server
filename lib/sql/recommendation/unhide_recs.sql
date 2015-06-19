UPDATE recommendations
SET hidden = FALSE
WHERE referred_shortlist = $1 AND
      object = $2
