UPDATE recommendations
SET referring_alerts = ARRAY_APPEND(referring_alerts, $3)
WHERE room = $1 AND
      listing = $2 AND
      NOT ($3 = ANY(referring_alerts));
