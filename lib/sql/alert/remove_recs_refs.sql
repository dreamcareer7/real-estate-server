UPDATE recommendations
SET referring_alerts = ARRAY_REMOVE(referring_alerts, $1)
WHERE referred_shortlist = $2 AND
      ($1 = ANY(referring_alerts))
