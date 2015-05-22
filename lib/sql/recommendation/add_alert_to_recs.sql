UPDATE recommendations
SET referring_alerts = ARRAY_APPEND(referring_alerts, $3)
WHERE referred_shortlist = $1 AND
      object = $2 AND
      NOT ($3 = ANY(referring_alerts));
